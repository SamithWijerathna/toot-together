import * as THREE from 'three';
import { PlayerCustomization } from '../../types/game';

/**
 * Procedural Cartoon Character Model
 * Features customizable skin colors, hats/accessories, facial expressions,
 * and procedural animations for walking, jumping, ragdoll stumble, and emotes.
 */
export class CharacterMesh {
  public root: THREE.Group;
  public bodyMesh: THREE.Mesh;
  public bellyMesh: THREE.Mesh;
  public headGroup: THREE.Group;
  public leftEye: THREE.Mesh;
  public rightEye: THREE.Mesh;
  public leftPupil: THREE.Mesh;
  public rightPupil: THREE.Mesh;
  public mouthMesh: THREE.Mesh;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;
  public leftLeg: THREE.Group;
  public rightLeg: THREE.Group;
  public accessoryGroup: THREE.Group;

  private bodyMaterial: THREE.MeshStandardMaterial;
  private bellyMaterial: THREE.MeshStandardMaterial;
  private eyeMaterial: THREE.MeshStandardMaterial;
  private pupilMaterial: THREE.MeshStandardMaterial;
  private mouthMaterial: THREE.MeshStandardMaterial;

  private walkCycle: number = 0;
  private customization: PlayerCustomization;

  constructor(customization: PlayerCustomization) {
    this.customization = customization;
    this.root = new THREE.Group();

    // Materials
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(customization.color),
      roughness: 0.35,
      metalness: 0.05,
    });

    this.bellyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(customization.secondaryColor),
      roughness: 0.4,
      metalness: 0.0,
    });

    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
    });

    this.pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.2,
    });

    this.mouthMaterial = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.5,
    });

    // 1. Torso / Chubby Body (Capsule / Smooth Rounded Bean)
    const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.45, 12, 16);
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    this.bodyMesh.position.y = 0.65;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.root.add(this.bodyMesh);

    // Cute lighter belly patch
    const bellyGeo = new THREE.SphereGeometry(0.38, 16, 12);
    this.bellyMesh = new THREE.Mesh(bellyGeo, this.bellyMaterial);
    this.bellyMesh.scale.set(0.8, 0.85, 0.5);
    this.bellyMesh.position.set(0, -0.05, 0.22);
    this.bodyMesh.add(this.bellyMesh);

    // 2. Head / Face Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.22, 0.25);
    this.bodyMesh.add(this.headGroup);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 12);
    const pupilGeo = new THREE.SphereGeometry(0.06, 12, 12);

    this.leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.leftEye.position.set(-0.16, 0.1, 0.14);
    this.headGroup.add(this.leftEye);

    this.leftPupil = new THREE.Mesh(pupilGeo, this.pupilMaterial);
    this.leftPupil.position.set(0, 0, 0.09);
    this.leftEye.add(this.leftPupil);

    this.rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.rightEye.position.set(0.16, 0.1, 0.14);
    this.headGroup.add(this.rightEye);

    this.rightPupil = new THREE.Mesh(pupilGeo, this.pupilMaterial);
    this.rightPupil.position.set(0, 0, 0.09);
    this.rightEye.add(this.rightPupil);

    // Mouth
    const mouthGeo = new THREE.TorusGeometry(0.08, 0.028, 8, 16, Math.PI);
    this.mouthMesh = new THREE.Mesh(mouthGeo, this.mouthMaterial);
    this.mouthMesh.position.set(0, -0.08, 0.18);
    this.mouthMesh.rotation.x = Math.PI * 0.1;
    this.headGroup.add(this.mouthMesh);

    // 3. Stubby Arms
    this.leftArm = this.createArm(-1);
    this.leftArm.position.set(-0.48, 0.15, 0);
    this.bodyMesh.add(this.leftArm);

    this.rightArm = this.createArm(1);
    this.rightArm.position.set(0.48, 0.15, 0);
    this.bodyMesh.add(this.rightArm);

    // 4. Stubby Legs
    this.leftLeg = this.createLeg();
    this.leftLeg.position.set(-0.22, -0.35, 0);
    this.bodyMesh.add(this.leftLeg);

    this.rightLeg = this.createLeg();
    this.rightLeg.position.set(0.22, -0.35, 0);
    this.bodyMesh.add(this.rightLeg);

    // 5. Accessory Mount
    this.accessoryGroup = new THREE.Group();
    this.accessoryGroup.position.set(0, 0.5, 0);
    this.bodyMesh.add(this.accessoryGroup);

    this.buildAccessory(customization.accessory);
  }

  private createArm(side: number): THREE.Group {
    const armGroup = new THREE.Group();
    const upperGeo = new THREE.CapsuleGeometry(0.1, 0.25, 8, 12);
    const armMesh = new THREE.Mesh(upperGeo, this.bodyMaterial);
    armMesh.position.y = -0.15;
    armMesh.rotation.z = side * 0.2;
    armMesh.castShadow = true;
    armGroup.add(armMesh);

    // Hand mitten
    const handGeo = new THREE.SphereGeometry(0.12, 12, 10);
    const handMesh = new THREE.Mesh(handGeo, this.bellyMaterial);
    handMesh.position.y = -0.3;
    handMesh.castShadow = true;
    armGroup.add(handMesh);

    return armGroup;
  }

  private createLeg(): THREE.Group {
    const legGroup = new THREE.Group();
    const legGeo = new THREE.CapsuleGeometry(0.12, 0.22, 8, 12);
    const legMesh = new THREE.Mesh(legGeo, this.bodyMaterial);
    legMesh.position.y = -0.12;
    legMesh.castShadow = true;
    legGroup.add(legMesh);

    // Cute chubby foot
    const footGeo = new THREE.BoxGeometry(0.2, 0.12, 0.28);
    const footMesh = new THREE.Mesh(footGeo, this.bellyMaterial);
    footMesh.position.set(0, -0.25, 0.06);
    footMesh.castShadow = true;
    legGroup.add(footMesh);

    return legGroup;
  }

  public updateCustomization(customization: PlayerCustomization) {
    this.customization = customization;
    this.bodyMaterial.color.set(customization.color);
    this.bellyMaterial.color.set(customization.secondaryColor);
    this.buildAccessory(customization.accessory);
    this.updateExpression(customization.faceExpression);
  }

  public buildAccessory(accessoryId: string) {
    // Clear existing accessories
    while (this.accessoryGroup.children.length > 0) {
      this.accessoryGroup.remove(this.accessoryGroup.children[0]);
    }

    if (!accessoryId || accessoryId === 'none') return;

    if (accessoryId === 'propeller') {
      // Beanie base + spinning propeller
      const capGeo = new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = -0.1;
      this.accessoryGroup.add(cap);

      const pinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
      const pinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.y = 0.25;
      this.accessoryGroup.add(pin);

      const bladeGeo = new THREE.BoxGeometry(0.5, 0.02, 0.08);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.32;
      blade.name = 'propeller-blade';
      this.accessoryGroup.add(blade);
    } else if (accessoryId === 'chef') {
      const baseGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
      const puffGeo = new THREE.SphereGeometry(0.4, 16, 12);
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      const base = new THREE.Mesh(baseGeo, whiteMat);
      const puff = new THREE.Mesh(puffGeo, whiteMat);
      puff.position.y = 0.28;
      puff.scale.set(1, 0.9, 1);
      this.accessoryGroup.add(base);
      this.accessoryGroup.add(puff);
    } else if (accessoryId === 'party') {
      const coneGeo = new THREE.ConeGeometry(0.24, 0.55, 16);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(0, 0.22, 0);
      cone.rotation.z = -0.15;
      this.accessoryGroup.add(cone);
    } else if (accessoryId === 'horns') {
      const hornGeo = new THREE.ConeGeometry(0.1, 0.35, 12);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.3 });
      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(-0.25, 0.15, 0);
      leftHorn.rotation.z = 0.45;
      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.position.set(0.25, 0.15, 0);
      rightHorn.rotation.z = -0.45;
      this.accessoryGroup.add(leftHorn);
      this.accessoryGroup.add(rightHorn);
    } else if (accessoryId === 'plunger') {
      const stickGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
      const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309 });
      const stick = new THREE.Mesh(stickGeo, woodMat);
      stick.position.set(0, 0.3, 0);
      stick.rotation.z = 0.2;

      const cupGeo = new THREE.ConeGeometry(0.25, 0.18, 16, 1, true);
      const rubberMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
      const cup = new THREE.Mesh(cupGeo, rubberMat);
      cup.position.set(0, 0.05, 0);
      cup.rotation.x = Math.PI;
      this.accessoryGroup.add(stick);
      this.accessoryGroup.add(cup);
    } else if (accessoryId === 'sunglasses') {
      const frameGeo = new THREE.BoxGeometry(0.65, 0.18, 0.08);
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
      const glasses = new THREE.Mesh(frameGeo, darkMat);
      glasses.position.set(0, -0.2, 0.36);
      this.accessoryGroup.add(glasses);
    } else if (accessoryId === 'halo') {
      const torusGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.6 });
      const halo = new THREE.Mesh(torusGeo, goldMat);
      halo.position.set(0, 0.4, 0);
      halo.rotation.x = Math.PI * 0.45;
      this.accessoryGroup.add(halo);
    }
  }

  public updateExpression(expr: PlayerCustomization['faceExpression']) {
    if (expr === 'dizzy') {
      // Spiral dizzy eyes: scale down pupils or rotate
      this.leftPupil.scale.set(1.5, 0.3, 1);
      this.rightPupil.scale.set(0.3, 1.5, 1);
      this.mouthMesh.rotation.z = Math.PI; // upside down frown
    } else if (expr === 'shocked') {
      this.leftPupil.scale.set(0.6, 0.6, 0.6);
      this.rightPupil.scale.set(0.6, 0.6, 0.6);
      this.mouthMesh.rotation.z = 0;
      this.mouthMesh.scale.set(1.4, 1.4, 1.4);
    } else if (expr === 'silly') {
      this.leftPupil.position.set(0.04, -0.04, 0.09);
      this.rightPupil.position.set(-0.04, 0.04, 0.09);
      this.mouthMesh.rotation.z = 0.3;
    } else {
      // Happy / default
      this.leftPupil.scale.set(1, 1, 1);
      this.rightPupil.scale.set(1, 1, 1);
      this.leftPupil.position.set(0, 0, 0.09);
      this.rightPupil.position.set(0, 0, 0.09);
      this.mouthMesh.rotation.z = 0;
      this.mouthMesh.scale.set(1, 1, 1);
    }
  }

  /**
   * Procedural Animation Step
   */
  public animate(
    delta: number,
    isMoving: boolean,
    isRunning: boolean,
    isGrounded: boolean,
    isRagdoll: boolean,
    emote: string | null = null,
    isFarting: boolean = false
  ) {
    // Spin propeller if equipped
    const propBlade = this.accessoryGroup.getObjectByName('propeller-blade');
    if (propBlade) {
      propBlade.rotation.y += delta * 15;
    }

    if (isRagdoll) {
      // Ragdoll collapse: limp flop, body tilted, limbs flailing loosely
      this.updateExpression('dizzy');
      this.bodyMesh.rotation.x = THREE.MathUtils.damp(this.bodyMesh.rotation.x, Math.PI * 0.45, 8, delta);
      this.bodyMesh.rotation.z = THREE.MathUtils.damp(this.bodyMesh.rotation.z, 0.3, 6, delta);
      this.leftArm.rotation.x = Math.sin(Date.now() * 0.015) * 0.8;
      this.rightArm.rotation.x = -Math.sin(Date.now() * 0.015) * 0.8;
      this.leftLeg.rotation.x = 0.6;
      this.rightLeg.rotation.x = -0.4;
      return;
    }

    // Reset base rotations smoothly
    this.bodyMesh.rotation.x = THREE.MathUtils.damp(this.bodyMesh.rotation.x, 0, 10, delta);
    this.bodyMesh.rotation.z = THREE.MathUtils.damp(this.bodyMesh.rotation.z, 0, 10, delta);

    if (isFarting) {
      // Squat & rocket pose
      this.updateExpression('shocked');
      this.bodyMesh.position.y = 0.55; // squat
      this.bodyMesh.rotation.x = 0.35; // lean forward
      this.leftArm.rotation.x = -1.2; // arms back like Superman/Naruto
      this.rightArm.rotation.x = -1.2;
      this.leftLeg.rotation.x = 0.5;
      this.rightLeg.rotation.x = 0.5;
      return;
    } else {
      this.bodyMesh.position.y = THREE.MathUtils.damp(this.bodyMesh.position.y, 0.65, 10, delta);
    }

    // Emotes
    if (emote) {
      if (emote === 'wave') {
        this.rightArm.rotation.x = -Math.PI * 0.8;
        this.rightArm.rotation.z = Math.sin(Date.now() * 0.015) * 0.5 - 0.2;
        this.leftArm.rotation.x = 0;
        return;
      } else if (emote === 'dance') {
        const t = Date.now() * 0.01;
        this.bodyMesh.rotation.y = Math.sin(t) * 0.6;
        this.bodyMesh.position.y = 0.65 + Math.abs(Math.sin(t * 2)) * 0.15;
        this.leftArm.rotation.z = -1.2 + Math.cos(t) * 0.4;
        this.rightArm.rotation.z = 1.2 - Math.cos(t) * 0.4;
        return;
      } else if (emote === 'laugh') {
        this.updateExpression('happy');
        const bounce = Math.sin(Date.now() * 0.02) * 0.12;
        this.bodyMesh.position.y = 0.65 + Math.abs(bounce);
        this.headGroup.rotation.x = -0.2 + bounce;
        this.leftArm.rotation.x = -0.4;
        this.rightArm.rotation.x = -0.4;
        return;
      } else if (emote === 'taunt') {
        this.updateExpression('silly');
        const t = Date.now() * 0.015;
        this.bodyMesh.rotation.y = Math.sin(t * 2) * 0.35;
        this.bodyMesh.position.y = 0.65 + Math.sin(t * 3) * 0.08;
        this.headGroup.rotation.z = Math.sin(t * 2) * 0.3;
        this.leftArm.rotation.z = -1.4 + Math.sin(t * 4) * 0.3;
        this.rightArm.rotation.z = 1.4 - Math.sin(t * 4) * 0.3;
        return;
      }
    }

    if (!isGrounded) {
      // Airborne flail
      this.updateExpression('shocked');
      const flail = Math.sin(Date.now() * 0.02);
      this.leftArm.rotation.x = -1.5 + flail * 0.8;
      this.rightArm.rotation.x = -1.5 - flail * 0.8;
      this.leftLeg.rotation.x = flail * 0.7;
      this.rightLeg.rotation.x = -flail * 0.7;
      return;
    }

    // Ground locomotion
    if (isMoving) {
      this.updateExpression(this.customization.faceExpression);
      const speed = isRunning ? 16 : 10;
      this.walkCycle += delta * speed;

      const swing = Math.sin(this.walkCycle);
      this.leftLeg.rotation.x = swing * 0.7;
      this.rightLeg.rotation.x = -swing * 0.7;

      this.leftArm.rotation.x = -swing * 0.7;
      this.rightArm.rotation.x = swing * 0.7;

      // Cute hip sway & bob
      this.bodyMesh.position.y = 0.65 + Math.abs(Math.cos(this.walkCycle)) * 0.06;
      this.bodyMesh.rotation.z = Math.sin(this.walkCycle) * 0.08;
    } else {
      // Idle breathing
      this.updateExpression(this.customization.faceExpression);
      const t = Date.now() * 0.003;
      this.bodyMesh.position.y = 0.65 + Math.sin(t) * 0.02;
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 8, delta);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 8, delta);
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0.1, 8, delta);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0.1, 8, delta);
      this.bodyMesh.rotation.z = THREE.MathUtils.damp(this.bodyMesh.rotation.z, 0, 8, delta);
    }
  }

  public dispose() {
    this.bodyGeoDispose(this.root);
  }

  private bodyGeoDispose(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      }
    });
  }
}
