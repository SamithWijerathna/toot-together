import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CharacterMesh } from './character/CharacterMesh';
import { MapBuilder } from './maps/MapDefinitions';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { soundManager } from '../audio/SoundManager';
import {
  GameMode,
  MapId,
  NetworkPlayer,
  PlayerCustomization,
  PlayerInput,
  PlayerPhysicsState,
} from '../types/game';

interface RemotePlayerContainer {
  character: CharacterMesh;
  targetPos: THREE.Vector3;
  targetRot: number;
  isGrounded: boolean;
  isRagdoll: boolean;
  emote: string | null;
  nameTag: HTMLDivElement;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public physicsWorld: PhysicsWorld;

  // Local Player
  public localCustomization: PlayerCustomization;
  public localCharacter: CharacterMesh;
  public localState: PlayerPhysicsState;
  public localInput: PlayerInput;

  // Remote Players
  public remotePlayers: Map<string, RemotePlayerContainer> = new Map();
  public uiOverlayContainer: HTMLDivElement;

  // Camera Orbit
  public camYaw: number = 0;
  public camPitch: number = 0.25;
  public camDistance: number = 4.8;
  public isPointerLocked: boolean = false;

  // Level
  public currentMapId: MapId = 'floating-islands';
  public currentMode: GameMode = 'coop-obby';
  private mapGroup: THREE.Group | null = null;

  // Animation Loop
  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;

  // Controls Settings
  public invertMouse: boolean = false;

  public setInvertMouse(invert: boolean) {
    this.invertMouse = invert;
  }

  // Callbacks
  public onPhysicsSync?: (state: PlayerPhysicsState) => void;
  public onFartBoost?: (pos: [number, number, number], forward: [number, number, number]) => void;
  public onEmoteTriggered?: (emote: string) => void;
  public onInteractTriggered?: (objectId: string, action: 'grab' | 'release' | 'throw' | 'press') => void;
  public onCheckpointReached?: (cp: number) => void;
  public onFinishReached?: () => void;
  public onFpsUpdate?: (fps: number) => void;

  // FPS metric
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Key tracking
  private keysDown: Record<string, boolean> = {};

  constructor(
    canvas: HTMLCanvasElement,
    uiOverlayContainer: HTMLDivElement,
    customization: PlayerCustomization,
    mapId: MapId = 'floating-islands',
    mode: GameMode = 'coop-obby'
  ) {
    this.canvas = canvas;
    this.uiOverlayContainer = uiOverlayContainer;
    this.localCustomization = customization;
    this.currentMapId = mapId;
    this.currentMode = mode;
    this.clock = new THREE.Clock();

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200
    );

    // 3. Renderer with PBR studio environment
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // RoomEnvironment reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(20, 35, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.4);
    fillLight.position.set(-20, 15, -15);
    this.scene.add(fillLight);

    // 5. Physics World
    this.physicsWorld = new PhysicsWorld(this.scene);

    // 6. Local Player
    this.localState = {
      id: 'local',
      position: [0, 1.5, 0],
      velocity: [0, 0, 0],
      rotation: 0,
      isGrounded: true,
      isRagdoll: false,
      ragdollTimer: 0,
      emote: null,
      fartCooldown: 0,
      holdingObjectId: null,
      score: 0,
      checkpoint: 0,
      hasFinished: false,
    };

    this.localInput = {
      forward: 0,
      sideways: 0,
      jump: false,
      sprint: false,
      crouch: false,
      fartBoost: false,
      interact: false,
      camYaw: 0,
      camPitch: 0.25,
    };

    this.localCharacter = new CharacterMesh(this.localCustomization);
    this.scene.add(this.localCharacter.root);

    // Load Map
    this.loadMap(mapId);

    // Event Listeners
    this.initEventListeners();
  }

  public loadMap(mapId: MapId) {
    this.currentMapId = mapId;

    if (this.mapGroup) {
      this.scene.remove(this.mapGroup);
      this.mapGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry?.dispose();
        }
      });
      this.mapGroup = null;
    }

    const mapData = MapBuilder.buildMap(mapId);
    this.mapGroup = mapData.group;
    this.scene.add(this.mapGroup);

    this.scene.background = new THREE.Color(mapData.skyColor);
    this.scene.fog = new THREE.FogExp2(mapData.fogColor, 0.012);

    this.physicsWorld.setLevelData(
      mapData.colliders,
      mapData.movingPlatforms,
      mapData.interactiveProps,
      mapData.checkpoints,
      mapData.spawnPoint,
      mapData.finishPoint,
      mapData.rotatingObstacles ?? [],
      mapData.wreckingBalls ?? []
    );

    // Reset local player to spawn
    this.localState.position = [mapData.spawnPoint.x, mapData.spawnPoint.y, mapData.spawnPoint.z];
    this.localState.velocity = [0, 0, 0];
    this.localState.checkpoint = 0;
    this.localState.hasFinished = false;
  }

  public updateLocalCustomization(c: PlayerCustomization) {
    this.localCustomization = c;
    this.localCharacter.updateCustomization(c);
  }

  public triggerLocalEmote(emote: string) {
    this.localState.emote = emote;
    if (this.onEmoteTriggered) {
      this.onEmoteTriggered(emote);
    }
    setTimeout(() => {
      if (this.localState.emote === emote) {
        this.localState.emote = null;
      }
    }, 2500);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private animate = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.08); // cap step to avoid tunneling
    const time = this.clock.getElapsedTime();

    // 1. Process Input
    this.processInput();

    // 2. Physics & Player Simulation
    const prevCheckpoint = this.localState.checkpoint;
    const prevFinished = this.localState.hasFinished;

    this.physicsWorld.updateEnvironment(time, delta);

    this.physicsWorld.updatePlayer(this.localState, this.localInput, delta, (pos) => {
      // Local fart blast forward calculation
      const fwd = new THREE.Vector3(Math.sin(this.localState.rotation), 0, Math.cos(this.localState.rotation));
      if (this.onFartBoost) {
        this.onFartBoost([pos.x, pos.y, pos.z], [fwd.x, fwd.y, fwd.z]);
      }
    });

    // Checkpoint & Finish callbacks
    if (this.localState.checkpoint > prevCheckpoint && this.onCheckpointReached) {
      this.onCheckpointReached(this.localState.checkpoint);
    }
    if (this.localState.hasFinished && !prevFinished && this.onFinishReached) {
      this.onFinishReached();
    }

    // 3. Update Local Character Mesh & Animations
    const pPos = new THREE.Vector3(...this.localState.position);
    this.localCharacter.root.position.copy(pPos);
    this.localCharacter.root.rotation.y = this.localState.rotation;

    const isMoving = Math.abs(this.localInput.forward) > 0.1 || Math.abs(this.localInput.sideways) > 0.1;
    const isRunning = this.localInput.sprint;
    const isFarting = this.localInput.fartBoost;

    this.localCharacter.animate(
      delta,
      isMoving,
      isRunning,
      this.localState.isGrounded,
      this.localState.isRagdoll,
      this.localState.emote,
      isFarting
    );

    // 4. Smooth Third-Person Camera Tracking
    this.updateCamera(delta, pPos);

    // 5. Update Remote Players
    this.updateRemotePlayers(delta);

    // 6. Network Broadcast Hook (throttled sync)
    if (this.onPhysicsSync) {
      this.onPhysicsSync(this.localState);
    }

    // 7. FPS counter
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      const currentFps = Math.round(this.frameCount / this.fpsTimer);
      if (this.onFpsUpdate) this.onFpsUpdate(currentFps);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // 8. Render
    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera(delta: number, target: THREE.Vector3) {
    // Clamp pitch
    this.camPitch = Math.max(-Math.PI * 0.2, Math.min(Math.PI * 0.38, this.camPitch));

    // Calculate camera target position
    const offsetX = Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDistance;
    const offsetY = Math.sin(this.camPitch) * this.camDistance;
    const offsetZ = Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDistance;

    const desiredCamPos = new THREE.Vector3(
      target.x + offsetX,
      target.y + 1.2 + offsetY,
      target.z + offsetZ
    );

    // Simple camera occlusion test against static colliders
    const camRay = new THREE.Ray(new THREE.Vector3(target.x, target.y + 1.2, target.z), desiredCamPos.clone().sub(new THREE.Vector3(target.x, target.y + 1.2, target.z)).normalize());
    let maxDist = this.camDistance;

    for (const col of this.physicsWorld.colliders) {
      const hit = camRay.intersectBox(col.bounds, new THREE.Vector3());
      if (hit) {
        const hitDist = hit.distanceTo(camRay.origin);
        if (hitDist < maxDist && hitDist > 0.8) {
          maxDist = Math.max(0.8, hitDist - 0.2);
        }
      }
    }

    const finalCamPos = camRay.origin.clone().addScaledVector(camRay.direction, maxDist);

    // Smooth camera damping
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, finalCamPos.x, 14, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, finalCamPos.y, 14, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, finalCamPos.z, 14, delta);

    const lookTarget = new THREE.Vector3(target.x, target.y + 0.9, target.z);
    this.camera.lookAt(lookTarget);
  }

  // Touch / Mobile Input State
  public touchInput = {
    forward: 0,
    sideways: 0,
    jump: false,
    sprint: false,
    crouch: false,
    fartBoost: false,
    interact: false,
  };

  public addCameraDelta(deltaYaw: number, deltaPitch: number) {
    this.camYaw -= deltaYaw;
    if (this.invertMouse) {
      this.camPitch += deltaPitch;
    } else {
      this.camPitch -= deltaPitch;
    }
  }

  public triggerInteract() {
    this.physicsWorld.handleInteract(this.localState);
    if (this.onInteractTriggered && this.localState.holdingObjectId) {
      this.onInteractTriggered(this.localState.holdingObjectId, 'grab');
    }
  }

  private processInput() {
    let fwd = this.touchInput.forward;
    let side = this.touchInput.sideways;
    if (this.keysDown['KeyW'] || this.keysDown['ArrowUp']) fwd += 1;
    if (this.keysDown['KeyS'] || this.keysDown['ArrowDown']) fwd -= 1;
    if (this.keysDown['KeyA'] || this.keysDown['ArrowLeft']) side -= 1;
    if (this.keysDown['KeyD'] || this.keysDown['ArrowRight']) side += 1;

    this.localInput.forward = Math.max(-1, Math.min(1, fwd));
    this.localInput.sideways = Math.max(-1, Math.min(1, side));
    this.localInput.jump = !!this.keysDown['Space'] || this.touchInput.jump;
    this.localInput.sprint = !!this.keysDown['ShiftLeft'] || !!this.keysDown['ShiftRight'] || this.touchInput.sprint;
    this.localInput.crouch = !!this.keysDown['ControlLeft'] || !!this.keysDown['KeyC'] || this.touchInput.crouch;
    this.localInput.fartBoost = !!this.keysDown['KeyF'] || this.touchInput.fartBoost;
    this.localInput.interact = !!this.keysDown['KeyE'] || this.touchInput.interact;
    this.localInput.camYaw = this.camYaw;
    this.localInput.camPitch = this.camPitch;
  }

  // ==========================================
  // MULTIPLAYER REMOTE PLAYERS
  // ==========================================
  public syncRemotePlayer(player: NetworkPlayer) {
    if (player.id === this.localState.id) return;

    let container = this.remotePlayers.get(player.id);
    if (!container) {
      // Create new remote player character & nameplate
      const character = new CharacterMesh(player.customization);
      this.scene.add(character.root);

      const nameTag = document.createElement('div');
      nameTag.className = 'absolute pointer-events-none transform -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-full text-xs font-bold shadow-md transition-opacity';
      nameTag.style.backgroundColor = player.customization.color || '#3b82f6';
      nameTag.style.color = '#ffffff';
      nameTag.textContent = player.name;
      this.uiOverlayContainer.appendChild(nameTag);

      container = {
        character,
        targetPos: new THREE.Vector3(...player.state.position),
        targetRot: player.state.rotation,
        isGrounded: player.state.isGrounded,
        isRagdoll: player.state.isRagdoll,
        emote: player.state.emote,
        nameTag,
      };
      this.remotePlayers.set(player.id, container);
    }

    // Update target state for smooth interpolation
    container.targetPos.set(...player.state.position);
    container.targetRot = player.state.rotation;
    container.isGrounded = player.state.isGrounded;
    container.isRagdoll = player.state.isRagdoll;
    container.emote = player.state.emote;
    container.character.updateCustomization(player.customization);
    container.nameTag.textContent = player.name;
  }

  public removeRemotePlayer(playerId: string) {
    const container = this.remotePlayers.get(playerId);
    if (container) {
      this.scene.remove(container.character.root);
      container.character.dispose();
      if (container.nameTag.parentNode) {
        container.nameTag.parentNode.removeChild(container.nameTag);
      }
      this.remotePlayers.delete(playerId);
    }
  }

  public handleRemoteFartBoost(playerId: string, pos: [number, number, number], forward: [number, number, number]) {
    const origin = new THREE.Vector3(...pos);
    const fwd = new THREE.Vector3(...forward);
    this.physicsWorld.spawnFartParticles(origin, fwd, 12);
    soundManager.playFart();

    // Check if local player is within the blast radius of this remote fart!
    const localPos = new THREE.Vector3(...this.localState.position);
    const dist = localPos.distanceTo(origin);
    if (dist < 4.5 && dist > 0.01) {
      const pushDir = localPos.clone().sub(origin).normalize();
      const knockback = pushDir.multiplyScalar((1 - dist / 4.5) * 16);
      knockback.y = 8;
      this.physicsWorld.triggerRagdoll(this.localState, knockback);
    }
  }

  private updateRemotePlayers(delta: number) {
    const tempScreenPos = new THREE.Vector3();

    this.remotePlayers.forEach((container) => {
      const charRoot = container.character.root;
      // Interpolate position and rotation
      const prevPos = charRoot.position.clone();
      charRoot.position.lerp(container.targetPos, 14 * delta);
      charRoot.rotation.y = THREE.MathUtils.damp(charRoot.rotation.y, container.targetRot, 14, delta);

      const isMoving = prevPos.distanceTo(charRoot.position) > 0.02;
      container.character.animate(
        delta,
        isMoving,
        false,
        container.isGrounded,
        container.isRagdoll,
        container.emote
      );

      // Project 3D position to 2D screen coordinates for Name Tag
      tempScreenPos.copy(charRoot.position);
      tempScreenPos.y += 1.4;
      tempScreenPos.project(this.camera);

      // Check if in front of camera
      if (tempScreenPos.z < 1) {
        const x = (tempScreenPos.x * 0.5 + 0.5) * this.canvas.clientWidth;
        const y = (-tempScreenPos.y * 0.5 + 0.5) * this.canvas.clientHeight;
        container.nameTag.style.display = 'block';
        container.nameTag.style.left = `${x}px`;
        container.nameTag.style.top = `${y}px`;
      } else {
        container.nameTag.style.display = 'none';
      }
    });
  }

  // ==========================================
  // EVENT LISTENERS & RESIZE
  // ==========================================
  private initEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);

    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Avoid capturing inputs if user is typing in chat/modal
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
      return;
    }

    this.keysDown[e.code] = true;

    if (e.code === 'KeyE') {
      this.physicsWorld.handleInteract(this.localState);
      if (this.onInteractTriggered && this.localState.holdingObjectId) {
        this.onInteractTriggered(this.localState.holdingObjectId, 'grab');
      }
    } else if (e.code === 'KeyR') {
      // Manual reset / recovery
      if (this.localState.isRagdoll) {
        this.localState.isRagdoll = false;
        soundManager.playLand(0.6);
      } else {
        // Respawn at checkpoint
        const pPos = new THREE.Vector3(...this.localState.position);
        const pVel = new THREE.Vector3(...this.localState.velocity);
        this.physicsWorld.respawnPlayer(this.localState, pPos, pVel);
      }
    } else if (e.code === 'Digit1') {
      this.triggerLocalEmote('wave');
    } else if (e.code === 'Digit2') {
      this.triggerLocalEmote('dance');
    } else if (e.code === 'Digit3') {
      this.triggerLocalEmote('laugh');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysDown[e.code] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && !this.isPointerLocked) {
      this.canvas.requestPointerLock?.();
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPointerLocked || e.buttons === 2) {
      const sens = 0.0028;
      this.camYaw -= e.movementX * sens;
      const pitchDelta = e.movementY * sens;
      if (this.invertMouse) {
        this.camPitch += pitchDelta;
      } else {
        this.camPitch -= pitchDelta;
      }
    }
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
  };

  private handleResize = () => {
    if (!this.canvas) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  public dispose() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    this.remotePlayers.forEach((container) => {
      container.character.dispose();
      if (container.nameTag.parentNode) container.nameTag.parentNode.removeChild(container.nameTag);
    });
    this.remotePlayers.clear();

    this.localCharacter.dispose();
    this.renderer.dispose();
  }
}
