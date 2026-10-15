import * as THREE from 'three';
import { MapMetadata } from '../../types/game';
import {
  CheckpointData,
  createCheckpointMesh,
  createTrophyMesh,
  InteractivePropData,
  MapBuildResult,
  MovingPlatformData,
  StaticCollider,
} from './MapHelpers';

export const FLOATING_ISLANDS_METADATA: MapMetadata = {
  id: 'floating-islands',
  name: 'Floating Islands',
  theme: 'Cloud Haven',
  description: 'Bouncy cloud platforms, wind drafts, moving sky bridges, and co-op dual-switches.',
  difficulty: 'Easy',
  previewColor: '#38bdf8',
  features: ['Bounce Pads', 'Moving Islands', 'Dual-Switch Door', 'Wind Fans'],
};

/**
 * Procedural Map 1: Floating Islands (Co-op Obby Champion)
 * Features floating cloud platforms, stepping stones, jump pads,
 * moving aerial platforms, interactive crates, and dual-switch barrier gates.
 */
export function buildFloatingIslands(): MapBuildResult {
  const group = new THREE.Group();
  const colliders: StaticCollider[] = [];
  const movingPlatforms: MovingPlatformData[] = [];
  const interactiveProps: InteractivePropData[] = [];
  const checkpoints: CheckpointData[] = [];

  // Materials
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.6 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
  const bounceMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.3,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.2,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0xfacc15,
    emissiveIntensity: 0.4,
  });
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });

  // Helper: Build a floating island with grass top and cone dirt bottom
  const makeIsland = (x: number, y: number, z: number, r: number, h: number = 1.2) => {
    const topGeo = new THREE.CylinderGeometry(r, r * 0.95, h, 16);
    const topMesh = new THREE.Mesh(topGeo, grassMat);
    topMesh.position.set(x, y, z);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    const bottomGeo = new THREE.ConeGeometry(r * 0.95, r * 1.5, 12);
    const bottomMesh = new THREE.Mesh(bottomGeo, dirtMat);
    bottomMesh.position.set(x, y - h * 0.5 - (r * 1.5) * 0.5, z);
    bottomMesh.rotation.x = Math.PI;
    group.add(bottomMesh);

    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(x, y, z), new THREE.Vector3(r * 2, h, r * 2));
    colliders.push({ type: 'cylinder', bounds: box, mesh: topMesh });
    return topMesh;
  };

  // 1. Spawn Island
  makeIsland(0, 0, 0, 6, 1.5);

  // Decorative clouds floating around
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 2, 8, 8), cloudMat);
    const ang = (i / 8) * Math.PI * 2;
    c.position.set(Math.cos(ang) * 35, -5 + Math.sin(i) * 3, Math.sin(ang) * 35);
    c.scale.set(1.8, 0.6, 1.2);
    group.add(c);
  }

  // Interactive Crates on Spawn
  for (let i = 0; i < 3; i++) {
    const crateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
    );
    crateMesh.castShadow = true;
    const pos = new THREE.Vector3(-2 + i * 1.8, 1.2, 1.5);
    crateMesh.position.copy(pos);
    group.add(crateMesh);

    interactiveProps.push({
      id: `crate-${i}`,
      type: 'box',
      mesh: crateMesh,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      mass: 1.0,
      size: new THREE.Vector3(0.9, 0.9, 0.9),
    });
  }

  // 2. Stepping Stone Islands (Parkour segment)
  const stones = [
    { x: 0, y: 0.5, z: -9, r: 2.2 },
    { x: 3.5, y: 1.5, z: -15, r: 2.0 },
    { x: -3.5, y: 2.5, z: -21, r: 2.0 },
    { x: 0, y: 3.5, z: -27, r: 3.5 },
  ];
  stones.forEach((s) => makeIsland(s.x, s.y, s.z, s.r));

  // Bounce Pad on 4th island to rocket player across gap
  const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.3, 16), bounceMat);
  padMesh.position.set(0, 3.5 + 0.7, -27);
  padMesh.castShadow = true;
  group.add(padMesh);

  const padBounds = new THREE.Box3();
  padBounds.setFromCenterAndSize(padMesh.position, new THREE.Vector3(2.4, 0.5, 2.4));
  colliders.push({ type: 'cylinder', bounds: padBounds, mesh: padMesh, isBouncy: true, bounceMultiplier: 2.3 });

  // Checkpoint 1 on Island 4
  const cp1 = createCheckpointMesh(1, new THREE.Vector3(0, 3.5 + 0.6, -25));
  group.add(cp1.mesh);
  checkpoints.push(cp1);

  // 3. Moving Platforms over the Sky Void
  const platGeo = new THREE.BoxGeometry(3.5, 0.6, 3.5);
  const platMesh1 = new THREE.Mesh(platGeo, woodMat);
  platMesh1.position.set(0, 7.0, -36);
  platMesh1.castShadow = true;
  group.add(platMesh1);

  movingPlatforms.push({
    id: 'platform-1',
    mesh: platMesh1,
    startPos: new THREE.Vector3(-6, 7.0, -36),
    endPos: new THREE.Vector3(6, 7.0, -36),
    speed: 1.5,
    axis: 'x',
    currentPos: new THREE.Vector3(0, 7.0, -36),
  });

  const platMesh2 = new THREE.Mesh(platGeo, woodMat);
  platMesh2.position.set(0, 8.5, -46);
  platMesh2.castShadow = true;
  group.add(platMesh2);

  movingPlatforms.push({
    id: 'platform-2',
    mesh: platMesh2,
    startPos: new THREE.Vector3(0, 6.0, -46),
    endPos: new THREE.Vector3(0, 10.5, -46),
    speed: 1.2,
    axis: 'y',
    currentPos: new THREE.Vector3(0, 8.5, -46),
  });

  // 4. Co-op Puzzle Island (Dual-Switch Gate)
  makeIsland(0, 10.0, -58, 6.5, 1.5);

  // Checkpoint 2
  const cp2 = createCheckpointMesh(2, new THREE.Vector3(0, 10.0 + 0.6, -54));
  group.add(cp2.mesh);
  checkpoints.push(cp2);

  // Co-op Door (Wall that slides down when buttons are pressed)
  const doorGeo = new THREE.BoxGeometry(5.0, 4.0, 0.8);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 12.0, -60);
  doorMesh.castShadow = true;
  group.add(doorMesh);

  interactiveProps.push({
    id: 'coop-door-1',
    type: 'door',
    mesh: doorMesh,
    position: doorMesh.position.clone(),
    velocity: new THREE.Vector3(),
    mass: 9999,
    size: new THREE.Vector3(5.0, 4.0, 0.8),
  });

  // Door static collider
  const doorBox = new THREE.Box3();
  doorBox.setFromCenterAndSize(doorMesh.position, new THREE.Vector3(5.0, 4.0, 0.8));
  colliders.push({ type: 'box', bounds: doorBox, mesh: doorMesh });

  // Button 1 (Left) & Button 2 (Right)
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  const btnMesh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.2, 16), btnMat);
  btnMesh1.position.set(-2.5, 10.8, -56);
  group.add(btnMesh1);

  const btnMesh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.2, 16), btnMat.clone());
  btnMesh2.position.set(2.5, 10.8, -56);
  group.add(btnMesh2);

  interactiveProps.push({
    id: 'coop-button-1',
    type: 'button',
    mesh: btnMesh1,
    position: btnMesh1.position.clone(),
    velocity: new THREE.Vector3(),
    mass: 0,
    radius: 0.7,
    linkedDoorId: 'coop-door-1',
  });

  interactiveProps.push({
    id: 'coop-button-2',
    type: 'button',
    mesh: btnMesh2,
    position: btnMesh2.position.clone(),
    velocity: new THREE.Vector3(),
    mass: 0,
    radius: 0.7,
    linkedDoorId: 'coop-door-1',
  });

  // 5. Final Victory Island (Golden Toilet / Trophy Podium)
  makeIsland(0, 11.5, -74, 5.5, 1.5);

  // Golden Trophy Shrine
  const trophy = createTrophyMesh(new THREE.Vector3(0, 12.3, -75), goldMat);
  group.add(trophy);

  const finishPoint = new THREE.Vector3(0, 12.5, -74);

  return {
    group,
    colliders,
    movingPlatforms,
    interactiveProps,
    checkpoints,
    spawnPoint: new THREE.Vector3(0, 1.5, 0),
    finishPoint,
    skyColor: 0xbae6fd, // light airy sky
    fogColor: 0xe0f2fe,
    rotatingObstacles: [],
    wreckingBalls: [],
  };
}
