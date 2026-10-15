import * as THREE from 'three';

export interface StaticCollider {
  type: 'box' | 'cylinder' | 'slope';
  bounds: THREE.Box3;
  mesh?: THREE.Object3D;
  isSlippery?: boolean;
  isBouncy?: boolean;
  bounceMultiplier?: number;
  isKillZone?: boolean;
}

export interface MovingPlatformData {
  id: string;
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  speed: number;
  axis: 'x' | 'y' | 'z';
  currentPos: THREE.Vector3;
  size?: THREE.Vector3;
}

export interface InteractivePropData {
  id: string;
  type: 'box' | 'barrel' | 'ball' | 'button' | 'door';
  mesh: THREE.Mesh | THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
  radius?: number;
  size?: THREE.Vector3;
  isHeld?: boolean;
  isPressed?: boolean;
  linkedDoorId?: string;
}

export interface CheckpointData {
  index: number;
  position: THREE.Vector3;
  mesh: THREE.Group;
}

/**
 * Rotating sweeper arm obstacle — a pivot Group that rotates around Y-axis.
 * The arm mesh is a child of the pivot, offset from center.
 * Collision is handled via radius + angle sweep check.
 */
export interface RotatingObstacleData {
  id: string;
  pivot: THREE.Group;   // Rotates around Y each frame
  armLength: number;    // Reach of arm from pivot center (for collision radius)
  armHalfHeight: number;// Y half-extent of arm mesh (for height check)
  speed: number;        // rad/s — positive = CCW, negative = CW
  isBar: boolean;       // true = arm extends both ways (full bar), false = one-sided
}

/**
 * Swinging wrecking ball / pendulum obstacle.
 * Oscillates in X using sin(time * speed + phase).
 */
export interface WreckingBallData {
  id: string;
  ballMesh: THREE.Mesh;       // The sphere mesh (child of ropeGroup)
  ropeMesh: THREE.Mesh;       // The thin cylinder rope (child of ropeGroup)
  ropeGroup: THREE.Group;     // Group that oscillates
  pivotX: number;             // World X center of swing
  pivotY: number;             // World Y of rope attachment top
  pivotZ: number;             // World Z position
  swingAmplitude: number;     // Max X deviation from pivot
  swingSpeed: number;         // Oscillation speed (rad/s)
  phase: number;              // Phase offset
  ballRadius: number;         // Sphere radius for collision detection
  currentBallPos: THREE.Vector3; // Updated each frame for collision
}

export interface MapBuildResult {
  group: THREE.Group;
  colliders: StaticCollider[];
  movingPlatforms: MovingPlatformData[];
  interactiveProps: InteractivePropData[];
  checkpoints: CheckpointData[];
  spawnPoint: THREE.Vector3;
  finishPoint: THREE.Vector3;
  skyColor: number;
  fogColor: number;
  rotatingObstacles: RotatingObstacleData[];
  wreckingBalls: WreckingBallData[];
}

// ── Shared helpers ──────────────────────────────────────────────────

/**
 * Creates a glowing green checkpoint pillar at the given position.
 */
export function createCheckpointMesh(index: number, pos: THREE.Vector3): CheckpointData {
  const cpGroup = new THREE.Group();
  cpGroup.position.copy(pos);

  const padMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.15, 16), padMat);
  cpGroup.add(pad);

  const beamMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.35 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 4.0, 16), beamMat);
  beam.position.y = 2.0;
  cpGroup.add(beam);

  return { index, position: pos, mesh: cpGroup };
}

/**
 * Creates a golden trophy podium.
 */
export function createTrophyMesh(pos: THREE.Vector3, mat?: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(pos);

  const trophyMat = mat || new THREE.MeshStandardMaterial({
    color: 0xfacc15, metalness: 0.8, roughness: 0.15,
    emissive: 0xfacc15, emissiveIntensity: 0.4,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 24), trophyMat);
  group.add(base);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 1.0, 16), trophyMat);
  stem.position.y = 0.75;
  group.add(stem);

  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), trophyMat);
  cup.position.y = 1.6;
  cup.rotation.x = Math.PI;
  group.add(cup);

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), trophyMat);
  star.position.y = 2.4;
  star.name = 'trophy-star';
  group.add(star);

  return group;
}

/**
 * Creates a warning-stripe hazard texture material (alternating red/white stripes).
 * Approximated with an emissive orange material for simplicity.
 */
export function makeHazardMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.4, emissive: 0xff4400, emissiveIntensity: 0.15 });
}
