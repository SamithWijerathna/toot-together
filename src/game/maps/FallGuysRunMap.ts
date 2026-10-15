import * as THREE from 'three';
import { MapMetadata } from '../../types/game';
import {
  CheckpointData,
  createCheckpointMesh,
  createTrophyMesh,
  InteractivePropData,
  MapBuildResult,
  MovingPlatformData,
  RotatingObstacleData,
  StaticCollider,
  WreckingBallData,
} from './MapHelpers';

export const FALL_GUYS_RUN_METADATA: MapMetadata = {
  id: 'fall-guys-run',
  name: 'Fall Guys Run',
  theme: 'Candy Chaos Course',
  description:
    'A brutal 250-unit obstacle gauntlet: sweeper arms, wrecking balls, moving walls, pendulums, and a final sprint. Only 1 in 60 survive.',
  difficulty: 'Chaotic',
  previewColor: '#ff3fa0',
  features: ['Sweeper Arms', 'Wrecking Balls', 'Moving Walls', 'Pendulum Pass', 'Narrow Sprint'],
};

// ── Material Palette (Fall Guys candy colours) ──────────────────────
function makeMats() {
  return {
    // Track surfaces
    floorCyan: new THREE.MeshStandardMaterial({ color: 0x00d4f5, roughness: 0.55 }),
    floorPink: new THREE.MeshStandardMaterial({ color: 0xff7ec4, roughness: 0.55 }),
    floorTile: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }),
    floorWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    floorIce: new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.05, metalness: 0.4 }),

    // Rails / walls
    wallPink: new THREE.MeshStandardMaterial({ color: 0xff3fa0, roughness: 0.35 }),
    wallPurple: new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.35 }),
    wallYellow: new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 }),

    // Obstacles
    sweeperOrange: new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      roughness: 0.3,
      emissive: 0xff6b35,
      emissiveIntensity: 0.12,
    }),
    wreckerPurple: new THREE.MeshStandardMaterial({
      color: 0xc026d3,
      roughness: 0.25,
      emissive: 0xc026d3,
      emissiveIntensity: 0.18,
    }),
    movingMagenta: new THREE.MeshStandardMaterial({ color: 0xe879f9, roughness: 0.3 }),
    hazardRed: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.35,
      emissive: 0xef4444,
      emissiveIntensity: 0.15,
    }),
    ropeGray: new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.6 }),

    // Accents
    bounceMat: new THREE.MeshStandardMaterial({
      color: 0xfde047,
      roughness: 0.2,
      emissive: 0xfde047,
      emissiveIntensity: 0.3,
    }),
    goldMat: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.5,
    }),
    checkeredWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  };
}

// ── Geometry helpers ──────────────────────────────────────────────────

/** Add a static floor slab and register its collider. */
function addFloor(
  group: THREE.Group,
  colliders: StaticCollider[],
  mat: THREE.Material,
  cx: number, cy: number, cz: number,
  w: number, h: number, d: number,
  opts?: { isSlippery?: boolean; isBouncy?: boolean; bounceMultiplier?: number }
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(cx, cy, cz);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);
  const box = new THREE.Box3();
  box.setFromCenterAndSize(new THREE.Vector3(cx, cy, cz), new THREE.Vector3(w, h, d));
  colliders.push({ type: 'box', bounds: box, mesh, ...opts });
  return mesh;
}

/** Add a wall slab (no player can pass). */
function addWall(
  group: THREE.Group,
  colliders: StaticCollider[],
  mat: THREE.Material,
  cx: number, cy: number, cz: number,
  w: number, h: number, d: number
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = true;
  group.add(mesh);
  const box = new THREE.Box3();
  box.setFromCenterAndSize(new THREE.Vector3(cx, cy, cz), new THREE.Vector3(w, h, d));
  colliders.push({ type: 'box', bounds: box, mesh });
  return mesh;
}

/**
 * Build a rotating sweeper arm.
 * @param pivotX/Y/Z  World position of the rotation pivot.
 * @param armLen      Total arm length (half extends each side if isBar, full one side if not).
 * @param armH        Height of arm mesh.
 * @param armW        Depth/width of arm mesh.
 * @param speed       Rotation speed in rad/s (positive = CCW from above).
 * @param isBar       If true arm is centred at pivot (spans both sides).
 * @param phase       Initial pivot Y-rotation in radians.
 */
function makeSweeper(
  group: THREE.Group,
  rotatingObstacles: RotatingObstacleData[],
  mat: THREE.Material,
  id: string,
  pivotX: number, pivotY: number, pivotZ: number,
  armLen: number,
  armH: number,
  armW: number,
  speed: number,
  isBar: boolean,
  phase: number = 0
): RotatingObstacleData {
  const pivot = new THREE.Group();
  pivot.position.set(pivotX, pivotY, pivotZ);
  pivot.rotation.y = phase;

  // Central rotating turntable hub
  const hubMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, armH + 0.35, 16),
    mat
  );
  hubMesh.position.set(0, (armH + 0.35) * 0.5, 0);
  hubMesh.castShadow = true;
  pivot.add(hubMesh);

  // Arm mesh offset: if isBar → centred at (0,0,0), if one-sided → offset so tip is at armLen
  const armOffsetX = isBar ? 0 : armLen * 0.5;
  const actualGeoLen = isBar ? armLen : armLen;

  const armMesh = new THREE.Mesh(new THREE.BoxGeometry(actualGeoLen, armH, armW), mat);
  armMesh.position.set(armOffsetX, armH * 0.5, 0);
  armMesh.castShadow = true;
  pivot.add(armMesh);

  group.add(pivot);

  const data: RotatingObstacleData = {
    id,
    pivot,
    armLength: isBar ? armLen * 0.5 : armLen,
    armHalfHeight: armH * 0.5,
    speed,
    isBar,
  };
  rotatingObstacles.push(data);
  return data;
}

/**
 * Add a sheltered resting alcove on the track edge where players can stay 100% safe from hazards.
 */
function addSafeAlcove(
  group: THREE.Group,
  colliders: StaticCollider[],
  floorMat: THREE.Material,
  wallMat: THREE.Material,
  side: 'left' | 'right',
  cz: number,
  depth: number = 5.0,
  width: number = 4.5,
  baseY: number = 0
) {
  const floorY = baseY - 0.5;
  const trackEdge = 7.0; // half of TRACK_W
  const cx = side === 'right' ? trackEdge + width * 0.5 : -trackEdge - width * 0.5;
  const outerX = side === 'right' ? trackEdge + width + 0.35 : -trackEdge - width - 0.35;
  const wallH = 2.5;

  // 1. Safe floor slab
  addFloor(group, colliders, floorMat, cx, floorY, cz, width, 1.0, depth);

  // 2. Decorative glowing green safe zone badge
  const safePad = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.6, 0.08, depth - 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.4,
      emissive: 0x22c55e,
      emissiveIntensity: 0.3,
    })
  );
  safePad.position.set(cx, baseY + 0.04, cz);
  group.add(safePad);

  // 3. Outer back safety wall
  addWall(group, colliders, wallMat, outerX, floorY + wallH * 0.5, cz, 0.7, wallH, depth);

  // 4. Side walls enclosing the alcove
  addWall(group, colliders, wallMat, cx, floorY + wallH * 0.5, cz - depth * 0.5, width, wallH, 0.7);
  addWall(group, colliders, wallMat, cx, floorY + wallH * 0.5, cz + depth * 0.5, width, wallH, 0.7);
}

/**
 * Build a wrecking ball pendulum.
 * The ball hangs from a rope and swings in the X direction.
 */
function makeWreckingBall(
  group: THREE.Group,
  wreckingBalls: WreckingBallData[],
  ballMat: THREE.Material,
  ropeMat: THREE.Material,
  id: string,
  pivotX: number, pivotY: number, pivotZ: number,
  ropeLen: number,
  ballRadius: number,
  amplitude: number,
  speed: number,
  phase: number = 0
): WreckingBallData {
  const ropeGroup = new THREE.Group();
  ropeGroup.position.set(pivotX, pivotY, pivotZ);

  // Rope cylinder
  const ropeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, ropeLen, 8), ropeMat);
  ropeMesh.position.set(0, -ropeLen * 0.5, 0);
  ropeGroup.add(ropeMesh);

  // Ball sphere
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 12), ballMat);
  ballMesh.position.set(0, -ropeLen, 0);
  ballMesh.castShadow = true;
  ropeGroup.add(ballMesh);

  group.add(ropeGroup);

  const data: WreckingBallData = {
    id,
    ballMesh,
    ropeMesh,
    ropeGroup,
    pivotX,
    pivotY,
    pivotZ,
    swingAmplitude: amplitude,
    swingSpeed: speed,
    phase,
    ballRadius,
    currentBallPos: new THREE.Vector3(pivotX, pivotY - ropeLen, pivotZ),
  };
  wreckingBalls.push(data);
  return data;
}

/** Add a moving platform (oscillates between startPos ↔ endPos using sin). */
function addMovingPlatform(
  group: THREE.Group,
  movingPlatforms: MovingPlatformData[],
  colliders: StaticCollider[],
  mat: THREE.Material,
  id: string,
  cx: number, cy: number, cz: number,
  w: number, h: number, d: number,
  axis: 'x' | 'y' | 'z',
  travel: number,
  speed: number
): MovingPlatformData {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat) as THREE.Mesh;
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const half = travel * 0.5;
  const startPos = new THREE.Vector3(cx, cy, cz);
  const endPos = new THREE.Vector3(cx, cy, cz);
  if (axis === 'x') { startPos.x -= half; endPos.x += half; }
  if (axis === 'y') { startPos.y -= half; endPos.y += half; }
  if (axis === 'z') { startPos.z -= half; endPos.z += half; }

  const data: MovingPlatformData = {
    id,
    mesh,
    startPos,
    endPos,
    speed,
    axis,
    currentPos: new THREE.Vector3(cx, cy, cz),
    size: new THREE.Vector3(w, h, d),
  };
  movingPlatforms.push(data);
  return data;
}

/** Add a sliding wall/block obstacle. */
function addSlidingWall(
  group: THREE.Group,
  movingPlatforms: MovingPlatformData[],
  mat: THREE.Material,
  id: string,
  cx: number, cy: number, cz: number,
  w: number, h: number, d: number,
  axis: 'x' | 'y' | 'z',
  travel: number,
  speed: number
) {
  return addMovingPlatform(group, movingPlatforms, [], mat, id, cx, cy, cz, w, h, d, axis, travel, speed);
}

// ── Checkered floor tile helper ───────────────────────────────────────
function addCheckeredFloor(
  group: THREE.Group,
  colliders: StaticCollider[],
  matA: THREE.Material,
  matB: THREE.Material,
  startX: number, y: number, startZ: number,
  tileW: number, tileD: number,
  cols: number, rows: number
) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const mat = (r + c) % 2 === 0 ? matA : matB;
      const cx = startX + c * tileW + tileW * 0.5;
      const cz = startZ - r * tileD - tileD * 0.5;
      addFloor(group, colliders, mat, cx, y, cz, tileW - 0.05, 0.4, tileD - 0.05);
    }
  }
}

// ── Guardrail helper ──────────────────────────────────────────────────
function addRails(
  group: THREE.Group,
  colliders: StaticCollider[],
  mat: THREE.Material,
  leftX: number, rightX: number,
  cy: number, cz: number,
  len: number,
  railH: number = 2.5
) {
  // Left rail
  addWall(group, colliders, mat, leftX, cy + railH * 0.5, cz, 0.7, railH, len);
  // Right rail
  addWall(group, colliders, mat, rightX, cy + railH * 0.5, cz, 0.7, railH, len);
}

// ════════════════════════════════════════════════════════════════════
//  MAIN MAP BUILD
// ════════════════════════════════════════════════════════════════════
/**
 * Fall Guys Run — 9 sections, ~250 units long, brutally hard.
 *
 * Track width: 14 units (playable 12 + 2×0.7 walls).
 * All Y-coordinates are at floor surface level = 0 (flat sky platform route).
 * The floor itself is at Y=0, top surface at Y=0 (1 unit thick slab, center at Y=-0.5).
 *
 * Section map (Z progresses negative → = forward):
 *   S1  z=  0 → -28   Grand Start + 3 roller bumpers
 *   S2  z=-31 → -70   Sweeper Alley: 5 rotating arms + gap
 *   S3  z=-73 → -98   Jump-Tile Grid: 4×6 tile gaps + rolling balls
 *   S4  z=-101→ -135  Wrecking Ball Bridge: narrow bridge + 4 pendulums
 *   S5  z=-138→ -168  Moving Platform Canyon: 8 floating platforms rising to Y=8
 *   S6  z=-171→ -198  Turbine Hall: 4 fast sweepers on slippery floor
 *   S7  z=-201→ -225  Mega-Wall Push: moving walls + tight corridor
 *   S8  z=-228→ -252  Final Sprint: everything combined, narrow, fast
 *   S9  z=-255→ -262  Crown Platform
 */
export function buildFallGuysRun(): MapBuildResult {
  const group = new THREE.Group();
  const colliders: StaticCollider[] = [];
  const movingPlatforms: MovingPlatformData[] = [];
  const interactiveProps: InteractivePropData[] = [];
  const checkpoints: CheckpointData[] = [];
  const rotatingObstacles: RotatingObstacleData[] = [];
  const wreckingBalls: WreckingBallData[] = [];

  const M = makeMats();

  // Track geometry constants
  const TRACK_W = 14;    // total track width
  const SLAB_H = 1.0;    // floor slab thickness
  const WALL_H = 2.5;    // guardrail height
  const LEFT = -TRACK_W * 0.5 - 0.35;   // wall centre X (left)
  const RIGHT = TRACK_W * 0.5 + 0.35;   // wall centre X (right)
  const FLOOR_Y = -SLAB_H * 0.5;        // slab centre Y (top surface at 0)

  // ── S0: CIRCULAR STAGING PAD (START ARENA) ───────────────── z: +17 → 0 ──
  {
    const PAD_Z = 9.0;
    const PAD_R = 8.5;

    // 1. Base circular platform cylinder (outer yellow rim)
    const baseCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(PAD_R, PAD_R * 0.96, SLAB_H, 36),
      M.wallYellow
    );
    baseCyl.position.set(0, FLOOR_Y, PAD_Z);
    baseCyl.receiveShadow = true;
    baseCyl.castShadow = true;
    group.add(baseCyl);

    // 2. Middle concentric tier (vibrant cyan ring)
    const midCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(6.6, 6.6, SLAB_H + 0.05, 32),
      M.floorCyan
    );
    midCyl.position.set(0, FLOOR_Y + 0.02, PAD_Z);
    midCyl.receiveShadow = true;
    group.add(midCyl);

    // 3. Center bullseye disc (hot pink)
    const centerCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, SLAB_H + 0.1, 28),
      M.floorPink
    );
    centerCyl.position.set(0, FLOOR_Y + 0.04, PAD_Z);
    centerCyl.receiveShadow = true;
    group.add(centerCyl);

    // 4. Center decorative golden star emblem
    const starMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.8, 6),
      M.goldMat
    );
    starMesh.rotation.x = -Math.PI * 0.5;
    starMesh.position.set(0, 0.08, PAD_Z);
    group.add(starMesh);

    // 5. Seamless walkway connecting circular pad into track entrance at Z=0
    addFloor(group, colliders, M.floorCyan, 0, FLOOR_Y, 2.5, TRACK_W, SLAB_H, 5.0);

    // 6. Solid physics colliders covering the circular pad area
    // Primary square box
    const mainPadBox = new THREE.Box3();
    mainPadBox.setFromCenterAndSize(
      new THREE.Vector3(0, FLOOR_Y, PAD_Z),
      new THREE.Vector3(PAD_R * 2, SLAB_H, PAD_R * 2)
    );
    colliders.push({ type: 'cylinder', bounds: mainPadBox, mesh: baseCyl });

    // Additional cross collider to ensure corners of circle are walk-safe
    const crossPadBox = new THREE.Box3();
    crossPadBox.setFromCenterAndSize(
      new THREE.Vector3(0, FLOOR_Y, PAD_Z),
      new THREE.Vector3(PAD_R * 1.8, SLAB_H, PAD_R * 1.8)
    );
    colliders.push({ type: 'cylinder', bounds: crossPadBox, mesh: baseCyl });

    // 7. Safety Perimeter Bumper Ring around the back and sides (keeps players from falling while waiting)
    const bumperCount = 13;
    const arcStart = Math.PI * 0.22; // ~40 degrees from front
    const arcEnd = Math.PI * 1.78;   // ~320 degrees
    for (let i = 0; i < bumperCount; i++) {
      const theta = arcStart + (i / (bumperCount - 1)) * (arcEnd - arcStart);
      const bx = Math.sin(theta) * (PAD_R - 0.4);
      const bz = PAD_Z + Math.cos(theta) * (PAD_R - 0.4);

      // Colorful bumper pillar
      const bumperMat = i % 2 === 0 ? M.wallPink : M.sweeperOrange;
      const bumperMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, WALL_H, 16),
        bumperMat
      );
      bumperMesh.position.set(bx, FLOOR_Y + WALL_H * 0.5, bz);
      bumperMesh.castShadow = true;
      group.add(bumperMesh);

      // Collider for each bumper post
      const bBox = new THREE.Box3();
      bBox.setFromCenterAndSize(
        new THREE.Vector3(bx, FLOOR_Y + WALL_H * 0.5, bz),
        new THREE.Vector3(1.3, WALL_H, 1.3)
      );
      colliders.push({ type: 'box', bounds: bBox, mesh: bumperMesh });
    }

    // Connect walkway rails to start line
    addRails(group, colliders, M.wallPink, LEFT, RIGHT, FLOOR_Y, 2.5, 5.0, WALL_H);

    // 8. Iconic Candy START Archway at Z = 0
    const pylonLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6.0, 16), M.wallYellow);
    pylonLeft.position.set(LEFT + 0.35, 3.0, 0);
    pylonLeft.castShadow = true;
    group.add(pylonLeft);

    const pylonRight = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6.0, 16), M.wallYellow);
    pylonRight.position.set(RIGHT - 0.35, 3.0, 0);
    pylonRight.castShadow = true;
    group.add(pylonRight);

    // Overhead crossbar
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(TRACK_W + 1.4, 0.9, 1.0), M.wallPink);
    crossbar.position.set(0, 5.5, 0);
    crossbar.castShadow = true;
    group.add(crossbar);

    // Glowing START sign / chevron block
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 0.4), signMat);
    signMesh.position.set(0, 6.7, 0);
    group.add(signMesh);

    // Interactive beach balls on start pad for players to kick / play while waiting
    const ballMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
    const ballGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const b1 = new THREE.Mesh(ballGeo, ballMat);
    b1.position.set(-3.5, 0.7, PAD_Z);
    b1.castShadow = true;
    group.add(b1);
    interactiveProps.push({
      id: 'start-ball-1',
      mesh: b1,
      type: 'ball',
      position: new THREE.Vector3(-3.5, 0.7, PAD_Z),
      velocity: new THREE.Vector3(0, 0, 0),
      isHeld: false,
      mass: 0.8,
      size: new THREE.Vector3(1.4, 1.4, 1.4),
    });

    const b2 = new THREE.Mesh(ballGeo, M.wallPink);
    b2.position.set(3.5, 0.7, PAD_Z);
    b2.castShadow = true;
    group.add(b2);
    interactiveProps.push({
      id: 'start-ball-2',
      mesh: b2,
      type: 'ball',
      position: new THREE.Vector3(3.5, 0.7, PAD_Z),
      velocity: new THREE.Vector3(0, 0, 0),
      isHeld: false,
      mass: 0.8,
      size: new THREE.Vector3(1.4, 1.4, 1.4),
    });
  }

  // ── S1: GRAND START ─────────────────────────────────────────── z: 0 → -28 ──
  {
    const len = 28;
    const cz = -len * 0.5;

    // Alternating checkered floor tiles (2 rows of colours)
    addCheckeredFloor(group, colliders, M.floorCyan, M.floorPink, -TRACK_W * 0.5, FLOOR_Y, 0, TRACK_W * 0.5, 7, 2, 4);

    // Walls
    addRails(group, colliders, M.wallPink, LEFT, RIGHT, FLOOR_Y, cz, len);

    // 3 sliding bumper cylinders crossing the track (left↔right)
    // Represented as fat rounded cylinders oriented along Z (so they roll across X)
    const mkRoller = (zPos: number, startX: number, endX: number, spd: number, idx: number) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, TRACK_W + 1, 16),
        M.hazardRed
      ) as THREE.Mesh;
      mesh.rotation.z = Math.PI * 0.5; // orient cylinder along X
      mesh.position.set(0, 0.9, zPos);
      mesh.castShadow = true;
      group.add(mesh);
      movingPlatforms.push({
        id: `s1-roller-${idx}`,
        mesh,
        startPos: new THREE.Vector3(startX, 0.9, zPos),
        endPos: new THREE.Vector3(endX, 0.9, zPos),
        speed: spd,
        axis: 'x',
        currentPos: new THREE.Vector3(0, 0.9, zPos),
        size: new THREE.Vector3(TRACK_W + 1, 1.8, 1.8),
      });
    };

    mkRoller(-7,  -5, 5, 1.8, 0);  // slow, centre swing
    mkRoller(-14,  5, -5, 2.5, 1); // medium, opposite phase
    mkRoller(-22, -4, 4, 3.2, 2);  // faster
  }

  // ── S2: SWEEPER ALLEY ─────────────────────────────────────── z: -31 → -70 ──
  {
    const SEC_Z0 = -31;
    const len = 39;
    const cz = SEC_Z0 - len * 0.5;

    // Solid floor
    addFloor(group, colliders, M.floorCyan, 0, FLOOR_Y, cz, TRACK_W, SLAB_H, len);

    // Segmented guardrails with doorway gaps into 4 safe haven alcoves:
    // Left side alcoves at Z = -50 and Z = -65 (doors from -47.5 to -52.5 and -62.5 to -67.5)
    addWall(group, colliders, M.wallPurple, LEFT, FLOOR_Y + WALL_H * 0.5, -39.25, 0.7, WALL_H, 16.5);
    addWall(group, colliders, M.wallPurple, LEFT, FLOOR_Y + WALL_H * 0.5, -57.5, 0.7, WALL_H, 10.0);
    addWall(group, colliders, M.wallPurple, LEFT, FLOOR_Y + WALL_H * 0.5, -69.25, 0.7, WALL_H, 3.5);

    // Right side alcoves at Z = -42 and Z = -58 (doors from -39.5 to -44.5 and -55.5 to -60.5)
    addWall(group, colliders, M.wallPurple, RIGHT, FLOOR_Y + WALL_H * 0.5, -35.25, 0.7, WALL_H, 8.5);
    addWall(group, colliders, M.wallPurple, RIGHT, FLOOR_Y + WALL_H * 0.5, -50.0, 0.7, WALL_H, 11.0);
    addWall(group, colliders, M.wallPurple, RIGHT, FLOOR_Y + WALL_H * 0.5, -65.75, 0.7, WALL_H, 10.5);

    // 4 Sheltered Resting Alcoves (100% immune from sweepers, room to stand & wait)
    addSafeAlcove(group, colliders, M.wallYellow, M.wallPurple, 'right', -42, 5.0, 4.5);
    addSafeAlcove(group, colliders, M.wallYellow, M.wallPurple, 'left', -50, 5.0, 4.5);
    addSafeAlcove(group, colliders, M.wallYellow, M.wallPurple, 'right', -58, 5.0, 4.5);
    addSafeAlcove(group, colliders, M.wallYellow, M.wallPurple, 'left', -65, 5.0, 4.5);

    // 5 sweeper arms at staggered Z — now low hurdle height (armH = 0.55), fully jumpable with Spacebar!
    // Arm 1: Left wall, leaves 4.5 units of safe walking space on right
    makeSweeper(group, rotatingObstacles, M.sweeperOrange,
      's2-sw-1',
      LEFT + 0.35, 0, -38,         // pivot at left wall edge, Y=0 (arm base), Z=-38
      9.5,                         // arm length (leaves safe lane on right)
      0.55, 0.75,                  // height, depth (jumpable hurdle!)
      0.9, false, 0                // speed rad/s, one-sided, phase 0
    );

    // Arm 2: Right wall, leaves 4.5 units of safe walking space on left
    makeSweeper(group, rotatingObstacles, M.sweeperOrange,
      's2-sw-2',
      RIGHT - 0.35, 0, -46,
      9.5,
      0.55, 0.75,
      -1.1, false, Math.PI
    );

    // Arm 3: Centre-mounted double-bar (leaves 2.75 units safe margin along both walls)
    makeSweeper(group, rotatingObstacles, M.hazardRed,
      's2-sw-3',
      0, 0, -54,
      8.5,                         // total bar length (reach 4.25 each side)
      0.55, 0.75,
      1.3, true, Math.PI * 0.5
    );

    // Arm 4: Left wall, leaves 4.5 units safe on right
    makeSweeper(group, rotatingObstacles, M.sweeperOrange,
      's2-sw-4',
      LEFT + 0.35, 0, -61,
      9.5,
      0.55, 0.75,
      -1.4, false, Math.PI * 0.75
    );

    // Arm 5: Centre bar, leaves 2.75 units safe on both sides
    makeSweeper(group, rotatingObstacles, M.hazardRed,
      's2-sw-5',
      0, 0, -67,
      8.5,
      0.55, 0.75,
      1.5, true, 0
    );

    // Large safe staging landing plaza at Checkpoint 1
    addFloor(group, colliders, M.wallYellow, 0, FLOOR_Y, -70.5, TRACK_W + 2, SLAB_H, 4.0);
    const cp1 = createCheckpointMesh(1, new THREE.Vector3(0, 0.5, -70.5));
    group.add(cp1.mesh);
    checkpoints.push(cp1);
  }

  // ── S3: JUMP-TILE GRID ─────────────────────────────────────── z: -73 → -98 ──
  {
    const SEC_Z0 = -73;
    // 4 columns × 5 rows of 2.8×4 tiles with gaps of 0.8 between
    // Tiles have 0.8-unit gaps → players must jump across
    const TILE_W = 2.8;
    const TILE_D = 4.0;
    const GAP_X = 0.8;
    const GAP_Z = 0.9;
    const COLS = 4;
    const ROWS = 5;

    // Total width = 4*(2.8+0.8) - 0.8 = 14.4 - 0.8 = 13.6 ≈ track width
    const gridStartX = -(COLS * (TILE_W + GAP_X) - GAP_X) * 0.5;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Skip 3 random-ish tiles per row to create voids
        if ((r === 0 && c === 1) || (r === 1 && c === 3) ||
            (r === 2 && c === 0) || (r === 3 && c === 2) ||
            (r === 4 && c === 1)) continue;

        const cx = gridStartX + c * (TILE_W + GAP_X) + TILE_W * 0.5;
        const cz = SEC_Z0 - r * (TILE_D + GAP_Z) - TILE_D * 0.5;
        const isBlue = (r + c) % 2 === 0;
        addFloor(group, colliders, isBlue ? M.floorCyan : M.floorPink,
          cx, FLOOR_Y, cz, TILE_W, SLAB_H, TILE_D);
      }
    }

    // 2 large rolling balls crossing the tile grid
    const mkBall = (zPos: number, idx: number) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), M.wreckerPurple) as THREE.Mesh;
      mesh.position.set(-4, 1.3, zPos);
      mesh.castShadow = true;
      group.add(mesh);

      interactiveProps.push({
        id: `s3-ball-${idx}`,
        type: 'ball',
        mesh,
        position: new THREE.Vector3(-4, 1.3, zPos),
        velocity: new THREE.Vector3(idx % 2 === 0 ? 4.5 : -4.5, 0, 0),
        mass: 5.0,
        radius: 1.3,
      });
    };
    mkBall(-80, 0);
    mkBall(-91, 1);
  }

  // ── S4: WRECKING BALL BRIDGE ─────────────────────────────── z: -101 → -135 ──
  {
    const SEC_Z0 = -101;
    const len = 34;
    const cz = SEC_Z0 - len * 0.5;

    // Very narrow bridge: only 5 units wide (brutal)
    const NARROW = 5.0;
    addFloor(group, colliders, M.floorWhite, 0, FLOOR_Y, cz, NARROW, SLAB_H, len);
    // Low half-walls so player can fall off (rail height=1.2 only)
    addRails(group, colliders, M.wallYellow, -NARROW * 0.5 - 0.35, NARROW * 0.5 + 0.35, FLOOR_Y, cz, len, 1.2);

    // Ceiling rig for pendulums (decorative beams at Y=8)
    for (let i = 0; i < 4; i++) {
      const beamZ = SEC_Z0 - 5 - i * 8;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(NARROW + 2, 0.5, 0.5), M.wallPurple);
      beam.position.set(0, 8, beamZ);
      group.add(beam);

      // Wrecking ball pendulum
      makeWreckingBall(
        group, wreckingBalls,
        M.wreckerPurple, M.ropeGray,
        `s4-ball-${i}`,
        0, 8.25, beamZ,          // pivot position
        6.5,                      // rope length
        1.1,                      // ball radius
        3.0,                      // swing amplitude (X)
        1.0 + i * 0.25,           // swing speed
        (i * Math.PI) * 0.5       // phase offset per ball
      );
    }

    // Checkpoint 2 mid-bridge
    const cp2 = createCheckpointMesh(2, new THREE.Vector3(0, 0.5, -118));
    group.add(cp2.mesh);
    checkpoints.push(cp2);
  }

  // ── S5: MOVING PLATFORM CANYON ─────────────────────────────── z: -138 → -168 ──
  // Platforms rise from Y=0 to Y=8 over 8 hops
  {
    const startZ = -140;
    // 8 floating platforms, each 4×4, with gaps of 3–4 units
    // Heights ramp from 0 → 8 across the sequence
    const plats: Array<{ z: number; y: number; axis: 'x' | 'y'; travel: number; spd: number }> = [
      { z: -140, y: 0.5, axis: 'x', travel: 5,   spd: 1.4 },
      { z: -147, y: 2.0, axis: 'y', travel: 3,   spd: 1.2 },
      { z: -153, y: 3.5, axis: 'x', travel: 6,   spd: 1.8 },
      { z: -158, y: 4.5, axis: 'y', travel: 4,   spd: 1.5 },
      { z: -163, y: 5.5, axis: 'x', travel: 5,   spd: 2.0 },
      { z: -167, y: 6.5, axis: 'y', travel: 3.5, spd: 1.6 },
      { z: -171, y: 7.5, axis: 'x', travel: 4,   spd: 2.2 },
      { z: -175, y: 8.0, axis: 'y', travel: 2.5, spd: 1.0 },
    ];

    plats.forEach((p, i) => {
      addMovingPlatform(
        group, movingPlatforms, colliders,
        M.floorTile,
        `s5-plat-${i}`,
        0, p.y - SLAB_H * 0.5, p.z,  // Y offset so top is at p.y
        4.5, SLAB_H, 4.5,
        p.axis, p.travel, p.spd
      );
    });

    // Bounce pad on first platform to help player launch
    const bPad = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.3, 16), M.bounceMat);
    bPad.position.set(0, 0.8, startZ);
    group.add(bPad);
    const bBounds = new THREE.Box3();
    bBounds.setFromCenterAndSize(bPad.position, new THREE.Vector3(2.0, 0.5, 2.0));
    colliders.push({ type: 'cylinder', bounds: bBounds, mesh: bPad, isBouncy: true, bounceMultiplier: 1.8 });

    // Elevated platform to land on after last hop (Z=-179, Y=8)
    addFloor(group, colliders, M.floorCyan, 0, 8 - SLAB_H * 0.5, -179, 8, SLAB_H, 6);
    addRails(group, colliders, M.wallPink, -4.35, 4.35, 8 - SLAB_H * 0.5, -179, 6);
  }

  // ── S6: TURBINE HALL ─────────────────────────────────────── z: -183 → -212 ──
  // All at Y=8. Floor is ICY (slippery). 4 fast double-bar sweepers.
  {
    const BASE_Y = 8.0;
    const SEC_Z0 = -183;
    const len = 29;
    const cz = SEC_Z0 - len * 0.5;

    addFloor(group, colliders, M.floorIce, 0, BASE_Y - SLAB_H * 0.5, cz, TRACK_W, SLAB_H, len, { isSlippery: true });

    // Segmented walls with safe alcoves off the ice
    addRails(group, colliders, M.wallPurple, LEFT, RIGHT, BASE_Y - SLAB_H * 0.5, cz, len);

    // Safe side islands off the ice for players to stay & wait safely
    addSafeAlcove(group, colliders, M.wallYellow, M.wallPurple, 'right', -195, 4.0, 4.0, BASE_Y);
    addSafeAlcove(group, colliders, M.wallYellow, M.wallPurple, 'left', -205, 4.0, 4.0, BASE_Y);

    // 4 fast double-bar sweepers — low hurdle height (armH = 0.55), jumpable!
    const swZPos = [-191, -198, -202, -208];
    const swSpeeds = [1.8, -2.0, 1.9, -2.2]; // alternating CW/CCW
    swZPos.forEach((z, i) => {
      makeSweeper(group, rotatingObstacles, M.hazardRed,
        `s6-turb-${i}`,
        0, BASE_Y, z,
        8.5,                       // leaves safe margin along walls
        0.55, 0.75,                // jumpable hurdle!
        swSpeeds[i], true, i * Math.PI * 0.4
      );
    });

    // Checkpoint 3 at end of turbine hall
    const cp3 = createCheckpointMesh(3, new THREE.Vector3(0, BASE_Y + 0.5, -211));
    group.add(cp3.mesh);
    checkpoints.push(cp3);
  }

  // ── S7: MEGA-WALL PUSH ──────────────────────────────────── z: -215 → -240 ──
  // Three sliding thick walls oscillate across a 9-wide corridor (base Y=8).
  // Players must weave through tight timing windows.
  {
    const BASE_Y = 8.0;
    const SEC_Z0 = -215;
    const len = 25;
    const cz = SEC_Z0 - len * 0.5;

    addFloor(group, colliders, M.floorPink, 0, BASE_Y - SLAB_H * 0.5, cz, TRACK_W, SLAB_H, len);
    addRails(group, colliders, M.wallPurple, LEFT, RIGHT, BASE_Y - SLAB_H * 0.5, cz, len);

    // Wall 1: fills most of X, leaves gap on right
    addSlidingWall(group, movingPlatforms, M.movingMagenta,
      's7-wall-1',
      -2.5, BASE_Y + 1.5, -220,  // cx, cy, cz
      9.0, 3.5, 2.0,              // w, h, d
      'x', 7.0, 1.2               // axis, travel, speed
    );

    // Wall 2: opposite phase gap  
    addSlidingWall(group, movingPlatforms, M.movingMagenta,
      's7-wall-2',
      2.5, BASE_Y + 1.5, -228,
      9.0, 3.5, 2.0,
      'x', 7.0, 1.6
    );

    // Wall 3: faster, 3-unit gap on alternating side
    addSlidingWall(group, movingPlatforms, M.movingMagenta,
      's7-wall-3',
      0, BASE_Y + 1.5, -236,
      9.5, 3.5, 2.0,
      'x', 6.0, 2.0
    );
  }

  // ── S8: FINAL SPRINT ─────────────────────────────────────── z: -243 → -268 ──
  // Narrow (7 wide), fast sweepers + wrecking balls.
  // Still at Y=8 for continuity.
  {
    const BASE_Y = 8.0;
    const SEC_Z0 = -243;
    const len = 25;
    const cz = SEC_Z0 - len * 0.5;

    // Narrow final floor
    const FINAL_W = 7.0;
    addFloor(group, colliders, M.floorCyan, 0, BASE_Y - SLAB_H * 0.5, cz, FINAL_W, SLAB_H, len);
    addRails(group, colliders, M.wallPink, -FINAL_W * 0.5 - 0.35, FINAL_W * 0.5 + 0.35, BASE_Y - SLAB_H * 0.5, cz, len, 1.0);

    // Safe alcove along final sprint
    addSafeAlcove(group, colliders, M.wallYellow, M.wallPink, 'right', -251, 3.5, 3.5, BASE_Y);

    // Sweeper 1: left wall, jumpable
    makeSweeper(group, rotatingObstacles, M.hazardRed,
      's8-sw-1',
      -FINAL_W * 0.5 + 0.35, BASE_Y, -247,
      5.0,
      0.55, 0.75,
      2.0, false, 0
    );

    // Sweeper 2: centre bar, jumpable
    makeSweeper(group, rotatingObstacles, M.hazardRed,
      's8-sw-2',
      0, BASE_Y, -255,
      4.8,
      0.55, 0.75,
      -2.2, true, Math.PI * 0.3
    );

    // Sweeper 3: right wall, jumpable
    makeSweeper(group, rotatingObstacles, M.hazardRed,
      's8-sw-3',
      FINAL_W * 0.5 - 0.35, BASE_Y, -261,
      5.0,
      0.55, 0.75,
      2.0, false, Math.PI
    );

    // One final pendulum wrecking ball
    const finalBeam = new THREE.Mesh(new THREE.BoxGeometry(FINAL_W + 1, 0.4, 0.4), M.wallPurple);
    finalBeam.position.set(0, BASE_Y + 8, -253);
    group.add(finalBeam);

    makeWreckingBall(
      group, wreckingBalls,
      M.wreckerPurple, M.ropeGray,
      's8-wball-final',
      0, BASE_Y + 8.25, -253,
      6.0,
      1.2,
      2.5,
      1.8,
      Math.PI * 0.5
    );

    // Checkpoint 4 near end
    const cp4 = createCheckpointMesh(4, new THREE.Vector3(0, BASE_Y + 0.5, -265));
    group.add(cp4.mesh);
    checkpoints.push(cp4);
  }

  // ── S9: CROWN PLATFORM ───────────────────────────────────── z: -271 → -278 ──
  {
    const BASE_Y = 8.0;

    // Large victory pad
    addFloor(group, colliders, M.floorWhite, 0, BASE_Y - SLAB_H * 0.5, -274.5, 12, SLAB_H, 8);
    addRails(group, colliders, M.wallPink, -6.35, 6.35, BASE_Y - SLAB_H * 0.5, -274.5, 8);

    // Golden crown trophy
    const trophy = createTrophyMesh(new THREE.Vector3(0, BASE_Y, -277), M.goldMat);
    group.add(trophy);

    // Giant glowing crown above trophy
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
    });
    const crownSphere = new THREE.Mesh(new THREE.OctahedronGeometry(1.8, 1), crownMat);
    crownSphere.position.set(0, BASE_Y + 5.5, -277);
    crownSphere.name = 'final-crown';
    group.add(crownSphere);

    // Confetti emitter rings (decorative torus rings)
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.4 + i * 0.5, 0.12, 8, 24),
        new THREE.MeshStandardMaterial({ color: [0xff3fa0, 0x00d4f5, 0xfde047][i], emissiveIntensity: 0.3, emissive: [0xff3fa0, 0x00d4f5, 0xfde047][i] })
      );
      ring.position.set(0, BASE_Y + 5.0, -277);
      ring.rotation.x = Math.PI * 0.5;
      group.add(ring);
    }
  }

  // ── Decorative sky elements ──────────────────────────────────────────
  // Background clouds scattered around
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.8 });
  const CLOUD_POSITIONS: Array<[number, number, number]> = [
    [-40, 12, -50], [45, 8, -90], [-35, 15, -130], [50, 10, -170],
    [-45, 6, -210], [40, 14, -250], [-30, 9, -140], [35, 11, -180],
  ];
  CLOUD_POSITIONS.forEach(([x, y, z]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 2.5, 8, 6), cloudMat);
    c.position.set(x, y, z);
    c.scale.set(2.2, 0.55, 1.4);
    group.add(c);
  });

  return {
    group,
    colliders,
    movingPlatforms,
    interactiveProps,
    checkpoints,
    spawnPoint: new THREE.Vector3(0, 1.5, 9),
    finishPoint: new THREE.Vector3(0, 8.5, -274),
    skyColor: 0x74d7f7,   // Fall Guys bright sky blue
    fogColor: 0xa8eafe,
    rotatingObstacles,
    wreckingBalls,
  };
}
