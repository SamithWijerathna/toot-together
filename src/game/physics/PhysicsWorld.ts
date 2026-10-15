import * as THREE from 'three';
import { soundManager } from '../../audio/SoundManager';
import {
  CheckpointData,
  InteractivePropData,
  MovingPlatformData,
  RotatingObstacleData,
  StaticCollider,
  WreckingBallData,
} from '../maps/MapHelpers';
import { PlayerInput, PlayerPhysicsState } from '../../types/game';

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleGrowth: number;
}

export class PhysicsWorld {
  public colliders: StaticCollider[] = [];
  public movingPlatforms: MovingPlatformData[] = [];
  public interactiveProps: InteractivePropData[] = [];
  public checkpoints: CheckpointData[] = [];
  public spawnPoint: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0);
  public finishPoint: THREE.Vector3 = new THREE.Vector3(0, 1.5, -50);

  // Dynamic obstacle systems
  public rotatingObstacles: RotatingObstacleData[] = [];
  public wreckingBalls: WreckingBallData[] = [];

  public scene: THREE.Scene;
  public particles: Particle[] = [];
  private particleGroup: THREE.Group;

  // Particle reusable geometries and materials
  private gasPuffGeo = new THREE.SphereGeometry(0.35, 8, 8);
  private gasPuffMats: THREE.MeshStandardMaterial[] = [
    new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.8, transparent: true, opacity: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9, transparent: true, opacity: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8, transparent: true, opacity: 0.75 }),
  ];

  // Held prop reference
  public heldProp: InteractivePropData | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
  }

  public setLevelData(
    colliders: StaticCollider[],
    movingPlatforms: MovingPlatformData[],
    interactiveProps: InteractivePropData[],
    checkpoints: CheckpointData[],
    spawnPoint: THREE.Vector3,
    finishPoint: THREE.Vector3,
    rotatingObstacles: RotatingObstacleData[] = [],
    wreckingBalls: WreckingBallData[] = []
  ) {
    this.colliders = colliders;
    this.movingPlatforms = movingPlatforms;
    this.interactiveProps = interactiveProps;
    this.checkpoints = checkpoints;
    this.spawnPoint = spawnPoint;
    this.finishPoint = finishPoint;
    this.rotatingObstacles = rotatingObstacles;
    this.wreckingBalls = wreckingBalls;
  }


  /**
   * Update moving platforms, interactive props, doors, and buttons
   */
  public updateEnvironment(time: number, delta: number) {
    // 1. Update moving platforms
    this.movingPlatforms.forEach((plat) => {
      const prevPos = plat.mesh.position.clone();
      const progress = (Math.sin(time * plat.speed) + 1) * 0.5; // 0 to 1
      const newPos = plat.startPos.clone().lerp(plat.endPos, progress);
      plat.mesh.position.copy(newPos);
      plat.currentPos.copy(newPos);
      plat.mesh.updateMatrixWorld();
    });

    // 2. Update Dual-Switch Buttons and Doors
    const buttonStates: Record<string, boolean> = {};
    const doorNeedsOpen: Record<string, number> = {};

    this.interactiveProps.forEach((prop) => {
      if (prop.type === 'button') {
        // Check if any box or player is near the button
        let isPressed = false;
        const btnPos = prop.mesh.position;

        // Check props
        this.interactiveProps.forEach((other) => {
          if (other.type === 'box' || other.type === 'barrel' || other.type === 'ball') {
            const dist = other.position.distanceTo(btnPos);
            if (dist < (prop.radius || 0.7) + 0.5 && Math.abs(other.position.y - btnPos.y) < 0.8) {
              isPressed = true;
            }
          }
        });

        prop.isPressed = isPressed;
        buttonStates[prop.id] = isPressed;

        // Visual button squash
        prop.mesh.position.y = isPressed ? btnPos.y - 0.1 : btnPos.y;

        if (prop.linkedDoorId) {
          if (!doorNeedsOpen[prop.linkedDoorId]) doorNeedsOpen[prop.linkedDoorId] = 0;
          if (isPressed) doorNeedsOpen[prop.linkedDoorId]++;
        }
      }
    });

    // Update Doors (slide down if all linked buttons are active)
    this.interactiveProps.forEach((prop) => {
      if (prop.type === 'door') {
        const count = doorNeedsOpen[prop.id] || 0;
        const shouldOpen = count >= 2; // dual switch
        const targetY = shouldOpen ? prop.position.y - 4.5 : prop.position.y;
        prop.mesh.position.y = THREE.MathUtils.damp(prop.mesh.position.y, targetY, 4, delta);
        prop.mesh.updateMatrixWorld();

        // Update collider bounds
        const col = this.colliders.find((c) => c.mesh === prop.mesh);
        if (col && prop.size) {
          col.bounds.setFromCenterAndSize(prop.mesh.position, prop.size);
        }
      }
    });

    // 3. Update physics props (gravity, velocity, damping)
    this.interactiveProps.forEach((prop) => {
      if (prop.type === 'door' || prop.type === 'button' || prop.isHeld) return;

      // Gravity
      prop.velocity.y -= 22 * delta;

      // Air/ground drag
      prop.velocity.x *= Math.max(0, 1 - 2.5 * delta);
      prop.velocity.z *= Math.max(0, 1 - 2.5 * delta);

      // Integrate
      prop.position.addScaledVector(prop.velocity, delta);

      // Simple floor boundary
      if (prop.position.y < 0.5) {
        prop.position.y = 0.5;
        prop.velocity.y = 0;
      }

      // Check against colliders
      const pBox = new THREE.Box3();
      const r = prop.radius || (prop.size ? prop.size.x * 0.5 : 0.5);
      pBox.setFromCenterAndSize(prop.position, new THREE.Vector3(r * 2, r * 2, r * 2));

      for (const col of this.colliders) {
        if (col.mesh === prop.mesh) continue;
        if (pBox.intersectsBox(col.bounds)) {
          // Push out vertically or horizontally
          if (prop.velocity.y < 0 && prop.position.y >= col.bounds.max.y - 0.3) {
            prop.position.y = col.bounds.max.y + r;
            prop.velocity.y = 0;
          }
        }
      }

      prop.mesh.position.copy(prop.position);
      if (prop.type === 'ball') {
        prop.mesh.rotation.x += prop.velocity.z * delta * 2;
        prop.mesh.rotation.z -= prop.velocity.x * delta * 2;
      }
      prop.mesh.updateMatrixWorld();
    });

    // 4. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      const s = 1 + (p.life / p.maxLife) * p.scaleGrowth;
      p.mesh.scale.set(s, s, s);

      // Fade opacity
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      if (mat.transparent) {
        mat.opacity = Math.max(0, 1 - p.life / p.maxLife);
      }

      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }

    // 5. Rotate sweeper arm pivots
    for (const obs of this.rotatingObstacles) {
      obs.pivot.rotation.y += obs.speed * delta;
    }

    // 6. Animate wrecking balls (pendulum swing in X)
    for (const ball of this.wreckingBalls) {
      const swing = Math.sin(time * ball.swingSpeed + ball.phase) * ball.swingAmplitude;
      // Rotate the ropeGroup around Z to simulate pendulum (or just translate X for simplicity)
      ball.ropeGroup.rotation.z = Math.sin(time * ball.swingSpeed + ball.phase) * (ball.swingAmplitude / 8);
      // Update cached ball world position
      ball.ballMesh.getWorldPosition(ball.currentBallPos);
    }
  }

  /**
   * Spawn comic cartoon fart smoke puff burst
   */
  public spawnFartParticles(origin: THREE.Vector3, forward: THREE.Vector3, count: number = 8) {
    for (let i = 0; i < count; i++) {
      const mat = this.gasPuffMats[Math.floor(Math.random() * this.gasPuffMats.length)].clone();
      const mesh = new THREE.Mesh(this.gasPuffGeo, mat);
      
      // Spawn slightly behind the character
      const offset = forward.clone().multiplyScalar(-0.6).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.3 + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.4
      ));
      mesh.position.copy(origin).add(offset);
      mesh.scale.setScalar(0.4 + Math.random() * 0.5);

      this.particleGroup.add(mesh);

      // Blast backwards and fan outward
      const vel = forward.clone().multiplyScalar(-3.5 - Math.random() * 3.0);
      vel.x += (Math.random() - 0.5) * 3.0;
      vel.y += 0.8 + Math.random() * 2.0;
      vel.z += (Math.random() - 0.5) * 3.0;

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        scaleGrowth: 2.2,
      });
    }
  }

  /**
   * Primary Player Movement, Physics, Ragdoll, Collision, and Interaction step
   */
  public updatePlayer(
    state: PlayerPhysicsState,
    input: PlayerInput,
    delta: number,
    onFartBlastNearby?: (pos: THREE.Vector3) => void
  ) {
    const pos = new THREE.Vector3(...state.position);
    const vel = new THREE.Vector3(...state.velocity);

    // Cooldown tick
    if (state.fartCooldown > 0) {
      state.fartCooldown = Math.max(0, state.fartCooldown - delta);
    }

    // Ragdoll recovery tick
    if (state.isRagdoll) {
      state.ragdollTimer -= delta;
      if (state.ragdollTimer <= 0) {
        state.isRagdoll = false;
        soundManager.playLand(0.8);
      } else {
        // Flop on ground with tumble friction
        vel.y -= 22 * delta;
        vel.x *= Math.max(0, 1 - 3.5 * delta);
        vel.z *= Math.max(0, 1 - 3.5 * delta);
        pos.addScaledVector(vel, delta);
        this.resolveStaticCollisions(pos, vel, state);
        state.position = [pos.x, pos.y, pos.z];
        state.velocity = [vel.x, vel.y, vel.z];
        return;
      }
    }

    // Direction vectors from camera yaw
    const forward = new THREE.Vector3(-Math.sin(input.camYaw), 0, -Math.cos(input.camYaw)).normalize();
    const right = new THREE.Vector3(Math.cos(input.camYaw), 0, -Math.sin(input.camYaw)).normalize();

    const moveDir = new THREE.Vector3();
    if (input.forward !== 0) moveDir.addScaledVector(forward, input.forward);
    if (input.sideways !== 0) moveDir.addScaledVector(right, input.sideways);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();
      // Target player rotation towards movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      state.rotation = targetAngle;
    }

    // Ground check & moving platform attachment
    const groundCheck = this.checkGround(pos);
    state.isGrounded = groundCheck.isGrounded;

    // If on moving platform, add platform displacement
    if (groundCheck.platformDelta) {
      pos.add(groundCheck.platformDelta);
    }

    // Slippery surface friction adjustment
    const friction = groundCheck.isSlippery ? 1.2 : 9.5;
    const accel = groundCheck.isSlippery ? 18 : (input.sprint ? 42 : 28);
    const maxSpeed = input.sprint ? 8.5 : 5.2;

    // Movement acceleration
    if (state.isGrounded) {
      if (isMoving) {
        const targetVelX = moveDir.x * maxSpeed;
        const targetVelZ = moveDir.z * maxSpeed;
        vel.x = THREE.MathUtils.damp(vel.x, targetVelX, accel, delta);
        vel.z = THREE.MathUtils.damp(vel.z, targetVelZ, accel, delta);
      } else {
        // Friction deceleration
        vel.x = THREE.MathUtils.damp(vel.x, 0, friction, delta);
        vel.z = THREE.MathUtils.damp(vel.z, 0, friction, delta);
      }

      // Jump
      if (input.jump) {
        vel.y = 8.8;
        state.isGrounded = false;
        soundManager.playJump();
      }
    } else {
      // In air - reduced control + gravity
      vel.y -= 24 * delta;
      if (isMoving) {
        vel.x += moveDir.x * 12 * delta;
        vel.z += moveDir.z * 12 * delta;
      }
      vel.x *= Math.max(0, 1 - 0.8 * delta);
      vel.z *= Math.max(0, 1 - 0.8 * delta);
    }

    // Fart Boost mechanic (Key 'F')
    if (input.fartBoost && state.fartCooldown <= 0) {
      state.fartCooldown = 2.2; // 2.2s cooldown
      soundManager.playFart();

      // Launch impulse: Forward vector from player orientation + upward pop
      const playerForward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation));
      const boostForward = isMoving ? moveDir : (input.forward !== 0 ? forward : playerForward);
      
      vel.x += boostForward.x * 14;
      vel.y = Math.max(vel.y + 7.5, 9.5);
      vel.z += boostForward.z * 14;
      state.isGrounded = false;

      // Spawn stylized cartoon gas smoke
      this.spawnFartParticles(pos, boostForward, 12);

      // Radial blast wave to push physics props and trigger nearby player pushes
      this.applyBlastWave(pos, 5.0, 18.0);
      if (onFartBlastNearby) onFartBlastNearby(pos);
    }

    // Integrate Position
    pos.addScaledVector(vel, delta);

    // Collision Resolution with Platforms & World
    this.resolveStaticCollisions(pos, vel, state);

    // ── Rotating sweeper arm collision ──────────────────────────────────
    if (!state.isRagdoll) {
      for (const obs of this.rotatingObstacles) {
        const piv = obs.pivot.position;
        const dx = pos.x - piv.x;
        const dz = pos.z - piv.z;
        const radialDist = Math.sqrt(dx * dx + dz * dz);

        // Only test if player is within arm reach + player radius margin
        if (radialDist < 0.6 || radialDist > obs.armLength + 1.0) continue;

        // Only test if player Y is within arm's vertical zone
        // Arm base is at pivot.y, arm height = armHalfHeight * 2
        if (pos.y < piv.y - 0.2 || pos.y > piv.y + obs.armHalfHeight * 2 + 1.0) continue;

        // Current arm world angle
        const armAngle = obs.pivot.rotation.y;
        // Player's angle relative to pivot
        const playerAngle = Math.atan2(dx, dz);

        // Angular difference to arm and its opposite end (for bars)
        const angleDiff = (a: number, b: number): number => {
          let d = Math.abs(a - b) % (Math.PI * 2);
          if (d > Math.PI) d = Math.PI * 2 - d;
          return d;
        };

        const diffA = angleDiff(playerAngle, armAngle);
        const diffB = obs.isBar ? angleDiff(playerAngle, armAngle + Math.PI) : Infinity;
        const minDiff = Math.min(diffA, diffB);

        // Hit zone: within 0.38 rad (~22°) of arm centre-line
        if (minDiff < 0.38) {
          const knockSpeed = Math.abs(obs.speed) * radialDist * 4.0;
          const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
          this.triggerRagdoll(state, new THREE.Vector3(
            pushDir.x * knockSpeed,
            5.5,
            pushDir.z * knockSpeed
          ));
          break;
        }
      }
    }

    // ── Wrecking ball collision ─────────────────────────────────────────
    if (!state.isRagdoll) {
      for (const ball of this.wreckingBalls) {
        const dist = pos.distanceTo(ball.currentBallPos);
        if (dist < ball.ballRadius + 0.7) {
          const pushDir = pos.clone().sub(ball.currentBallPos).normalize();
          pushDir.y = Math.max(pushDir.y, 0.4);
          this.triggerRagdoll(state, pushDir.multiplyScalar(16));
          break;
        }
      }
    }

    // Void / Fall Check
    if (pos.y < -15) {
      this.respawnPlayer(state, pos, vel);
    }

    // Checkpoint Trigger Check
    for (const cp of this.checkpoints) {
      if (pos.distanceTo(cp.position) < 2.5 && state.checkpoint < cp.index) {
        state.checkpoint = cp.index;
        soundManager.playCheckpoint();
      }
    }

    // Finish Trigger Check
    if (pos.distanceTo(this.finishPoint) < 3.2 && !state.hasFinished) {
      state.hasFinished = true;
      soundManager.playCheckpoint();
    }

    // Update held prop position
    if (this.heldProp) {
      const carryPos = pos.clone().add(new THREE.Vector3(
        Math.sin(state.rotation) * 1.1,
        0.8,
        Math.cos(state.rotation) * 1.1
      ));
      this.heldProp.position.copy(carryPos);
      this.heldProp.velocity.set(0, 0, 0);
      this.heldProp.mesh.position.copy(carryPos);
      this.heldProp.mesh.updateMatrixWorld();
    }

    // Write back
    state.position = [pos.x, pos.y, pos.z];
    state.velocity = [vel.x, vel.y, vel.z];
  }

  /**
   * Interact key 'E': grab or throw prop
   */
  public handleInteract(state: PlayerPhysicsState) {
    if (this.heldProp) {
      // Throw prop forward
      const throwDir = new THREE.Vector3(Math.sin(state.rotation), 0.4, Math.cos(state.rotation)).normalize();
      this.heldProp.velocity.copy(throwDir.multiplyScalar(12));
      this.heldProp.isHeld = false;
      this.heldProp = null;
      state.holdingObjectId = null;
      soundManager.playBounce();
      return;
    }

    // Look for nearby grabbable prop
    const pPos = new THREE.Vector3(...state.position);
    for (const prop of this.interactiveProps) {
      if (prop.type === 'box' || prop.type === 'barrel' || prop.type === 'ball') {
        if (pPos.distanceTo(prop.position) < 2.2) {
          prop.isHeld = true;
          this.heldProp = prop;
          state.holdingObjectId = prop.id;
          soundManager.playClick();
          break;
        }
      }
    }
  }

  /**
   * Ground check with raycast downwards
   */
  private checkGround(pos: THREE.Vector3): { isGrounded: boolean; isSlippery: boolean; platformDelta?: THREE.Vector3 } {
    const rayOrigin = pos.clone().add(new THREE.Vector3(0, 0.4, 0));
    const rayDir = new THREE.Vector3(0, -1, 0);
    const rayLength = 0.55;

    // Check moving platforms
    for (const plat of this.movingPlatforms) {
      const pBox = new THREE.Box3().setFromObject(plat.mesh);
      if (
        pos.x >= pBox.min.x - 0.4 &&
        pos.x <= pBox.max.x + 0.4 &&
        pos.z >= pBox.min.z - 0.4 &&
        pos.z <= pBox.max.z + 0.4 &&
        pos.y >= pBox.max.y - 0.25 &&
        pos.y <= pBox.max.y + 0.45
      ) {
        return { isGrounded: true, isSlippery: false };
      }
    }

    // Check static colliders
    for (const col of this.colliders) {
      if (
        pos.x >= col.bounds.min.x - 0.35 &&
        pos.x <= col.bounds.max.x + 0.35 &&
        pos.z >= col.bounds.min.z - 0.35 &&
        pos.z <= col.bounds.max.z + 0.35 &&
        pos.y >= col.bounds.max.y - 0.25 &&
        pos.y <= col.bounds.max.y + 0.45
      ) {
        return { isGrounded: true, isSlippery: !!col.isSlippery };
      }
    }

    return { isGrounded: false, isSlippery: false };
  }

  /**
   * Collision resolution against bounding boxes and bouncy pads
   */
  private resolveStaticCollisions(pos: THREE.Vector3, vel: THREE.Vector3, state: PlayerPhysicsState) {
    const playerRadius = 0.42;
    const playerHeight = 1.3;

    // Bounding box of player capsule
    const pBox = new THREE.Box3(
      new THREE.Vector3(pos.x - playerRadius, pos.y, pos.z - playerRadius),
      new THREE.Vector3(pos.x + playerRadius, pos.y + playerHeight, pos.z + playerRadius)
    );

    // Collide with moving platforms
    for (const plat of this.movingPlatforms) {
      const platBox = new THREE.Box3().setFromObject(plat.mesh);
      if (pBox.intersectsBox(platBox)) {
        if (vel.y <= 0 && pos.y >= platBox.max.y - 0.4) {
          pos.y = platBox.max.y;
          vel.y = 0;
          state.isGrounded = true;
        }
      }
    }

    // Collide with static colliders
    for (const col of this.colliders) {
      if (pBox.intersectsBox(col.bounds)) {
        // Trampoline / Bouncy bumper hit
        if (col.isBouncy) {
          vel.y = 15.5 * (col.bounceMultiplier || 1.8);
          soundManager.playBounce();
          state.isGrounded = false;
          return;
        }

        // Top landing
        if (vel.y <= 0 && pos.y >= col.bounds.max.y - 0.45) {
          pos.y = col.bounds.max.y;
          vel.y = 0;
          state.isGrounded = true;
          continue;
        }

        // Horizontal pushback
        const dx1 = pos.x + playerRadius - col.bounds.min.x;
        const dx2 = col.bounds.max.x - (pos.x - playerRadius);
        const dz1 = pos.z + playerRadius - col.bounds.min.z;
        const dz2 = col.bounds.max.z - (pos.z - playerRadius);
        const minOverlap = Math.min(dx1, dx2, dz1, dz2);

        if (minOverlap === dx1) {
          pos.x = col.bounds.min.x - playerRadius;
          vel.x = 0;
        } else if (minOverlap === dx2) {
          pos.x = col.bounds.max.x + playerRadius;
          vel.x = 0;
        } else if (minOverlap === dz1) {
          pos.z = col.bounds.min.z - playerRadius;
          vel.z = 0;
        } else if (minOverlap === dz2) {
          pos.z = col.bounds.max.z + playerRadius;
          vel.z = 0;
        }
      }
    }

    // Push against interactive props
    for (const prop of this.interactiveProps) {
      if (prop.isHeld || prop.type === 'door' || prop.type === 'button') continue;
      const dist = pos.distanceTo(prop.position);
      const minDist = playerRadius + (prop.radius || 0.5);
      if (dist < minDist && dist > 0.001) {
        const pushDir = prop.position.clone().sub(pos).normalize();
        prop.velocity.addScaledVector(pushDir, 5.0);
        pos.addScaledVector(pushDir, -(minDist - dist) * 0.5);
      }
    }
  }

  /**
   * Radial fart blast wave impulse
   */
  public applyBlastWave(epicenter: THREE.Vector3, radius: number, strength: number) {
    this.interactiveProps.forEach((prop) => {
      if (prop.isHeld || prop.type === 'door' || prop.type === 'button') return;
      const diff = prop.position.clone().sub(epicenter);
      const dist = diff.length();
      if (dist < radius && dist > 0.001) {
        const factor = (1 - dist / radius) * strength;
        diff.normalize();
        prop.velocity.addScaledVector(diff, factor);
        prop.velocity.y += factor * 0.4;
      }
    });
  }

  /**
   * Trigger ragdoll stumble
   */
  public triggerRagdoll(state: PlayerPhysicsState, impulse?: THREE.Vector3) {
    state.isRagdoll = true;
    state.ragdollTimer = 1.8; // 1.8s stumble
    soundManager.playSlip();
    if (impulse) {
      state.velocity[0] += impulse.x;
      state.velocity[1] += impulse.y;
      state.velocity[2] += impulse.z;
    }
  }

  /**
   * Respawn player at last checkpoint or spawn
   */
  public respawnPlayer(state: PlayerPhysicsState, pos: THREE.Vector3, vel: THREE.Vector3) {
    let spawn = this.spawnPoint.clone();
    if (state.checkpoint > 0) {
      const cp = this.checkpoints.find((c) => c.index === state.checkpoint);
      if (cp) spawn = cp.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    }

    pos.copy(spawn);
    vel.set(0, 0, 0);
    state.position = [pos.x, pos.y, pos.z];
    state.velocity = [0, 0, 0];
    soundManager.playLand(1.0);
  }
}
