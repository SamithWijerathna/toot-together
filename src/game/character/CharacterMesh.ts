import * as THREE from 'three';
import { PlayerCustomization } from '../../types/game';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Global cache for the rigged Creative_Character_free.glb model and animations
let cachedCharacterData: { scene: THREE.Group; animations: THREE.AnimationClip[] } | null = null;
let characterLoadingPromise: Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> | null = null;

function getCreativeCharacterAssets(): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  if (cachedCharacterData) {
    return Promise.resolve(cachedCharacterData);
  }
  if (characterLoadingPromise) return characterLoadingPromise;

  characterLoadingPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('SSR environment'));
    }

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/Creative_Character_free.glb',
      (gltf) => {
        cachedCharacterData = { scene: gltf.scene as THREE.Group, animations: gltf.animations };
        resolve(cachedCharacterData);
      },
      undefined,
      (err) => {
        console.error('[CharacterMesh] Failed to load Creative_Character_free.glb:', err);
        reject(err);
      }
    );
  });

  return characterLoadingPromise;
}

/**
 * CharacterMesh
 * The player character using Creative_Character_free.glb.
 * Fully rigged with a 44-joint skeleton, customizable outfits/accessories/emotions,
 * and 30 native high-quality skeletal animations.
 */
export class CharacterMesh {
  public root: THREE.Group;
  public characterGroup: THREE.Group;

  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentActionName: string = 'idle';

  private parts: Map<string, THREE.SkinnedMesh> = new Map();
  private shirtMat: THREE.MeshStandardMaterial | null = null;
  private pantsMat: THREE.MeshStandardMaterial | null = null;
  private baseMat: THREE.Material | null = null;

  private customization: PlayerCustomization;
  private isDisposed: boolean = false;
  public isLoaded: boolean = false;

  constructor(customization: PlayerCustomization) {
    this.customization = customization;
    this.root = new THREE.Group();

    this.characterGroup = new THREE.Group();
    this.root.add(this.characterGroup);

    this.initCharacter();
  }

  private async initCharacter() {
    try {
      const { scene, animations } = await getCreativeCharacterAssets();
      if (this.isDisposed || !this.root) return;

      const cloned = SkeletonUtils.clone(scene) as THREE.Group;
      // Scale to fit physics capsule (height ~1.35 units)
      cloned.scale.set(0.74, 0.74, 0.74);
      cloned.position.set(0, 0, 0);

      this.mixer = new THREE.AnimationMixer(cloned);

      // Map animation clips from Creative_Character_free.glb
      const clipMap: Record<string, string> = {
        idle: 'Idle_Breathing',
        walk: 'Walk_Forward',
        run: 'Run_Forward',
        jump: 'Jump_Loop',
        fall: 'Fall',
        hit: 'Hit_Reaction_Heavy',
        crouch: 'Crouch_Walk _Forward',
        dance: 'Dodge_Roll',
        taunt: 'Attack_Punch',
      };

      for (const [key, clipName] of Object.entries(clipMap)) {
        const clip = animations.find(
          (a) => a.name === clipName || a.name.toLowerCase() === clipName.toLowerCase()
        );
        if (clip) {
          const action = this.mixer.clipAction(clip);
          if (key === 'hit' || key === 'taunt') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          this.actions.set(key, action);
        }
      }

      // Collect all skinned meshes and prepare material tinting
      cloned.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const mesh = child as THREE.SkinnedMesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.parts.set(mesh.name, mesh);

          if (!this.baseMat && mesh.material) {
            this.baseMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          }
        }
      });

      // Create customizable materials for shirt and pants using the embedded texture
      if (this.baseMat && (this.baseMat as THREE.MeshStandardMaterial).map) {
        const texture = (this.baseMat as THREE.MeshStandardMaterial).map;
        this.shirtMat = new THREE.MeshStandardMaterial({
          map: texture,
          color: new THREE.Color(this.customization.color),
          roughness: 0.5,
          metalness: 0.05,
        });

        this.pantsMat = new THREE.MeshStandardMaterial({
          map: texture,
          color: new THREE.Color(this.customization.secondaryColor),
          roughness: 0.55,
          metalness: 0.05,
        });

        const shirtMesh = this.parts.get('T_Shirt_009');
        if (shirtMesh) shirtMesh.material = this.shirtMat;

        const pantsMesh = this.parts.get('Pants_010');
        if (pantsMesh) pantsMesh.material = this.pantsMat;
      }

      this.characterGroup.add(cloned);
      this.isLoaded = true;

      // Apply initial outfit and face visibility
      this.applyCustomization();

      // Start initial idle animation
      const idleAction = this.actions.get('idle');
      if (idleAction) {
        idleAction.play();
        this.currentActionName = 'idle';
      }
    } catch (err) {
      console.error('[CharacterMesh] Error initializing character:', err);
    }
  }

  public applyCustomization() {
    if (!this.isLoaded) return;

    if (this.shirtMat) this.shirtMat.color.set(this.customization.color);
    if (this.pantsMat) this.pantsMat.color.set(this.customization.secondaryColor);

    // Active base meshes
    const activeNames = new Set<string>([
      'Body_010',
      'T_Shirt_009',
      'Pants_010',
      'Shoe_Sneakers_009',
      'Hairstyle_male_010',
    ]);

    // Face emotion
    const expr = this.customization.faceExpression;
    if (expr === 'happy' || expr === 'silly') {
      activeNames.add('Male_emotion_happy_002');
    } else if (expr === 'shocked' || expr === 'dizzy') {
      activeNames.add('Male_emotion_angry_003');
    } else {
      activeNames.add('Male_emotion_usual_001');
    }

    // Accessory selection
    const acc = this.customization.accessory;
    if (acc === 'party') {
      activeNames.add('Hat_049');
      activeNames.delete('Hairstyle_male_010');
    } else if (acc === 'cap' || acc === 'propeller') {
      activeNames.add('Hat_010');
    } else if (acc === 'horns') {
      activeNames.add('Hat_057');
      activeNames.delete('Hairstyle_male_010');
    } else if (acc === 'headphones' || acc === 'halo') {
      activeNames.add('Headphones_002');
    } else if (acc === 'sunglasses') {
      activeNames.add('Glasses_006');
    } else if (acc === 'glasses') {
      activeNames.add('Glasses_004');
    } else if (acc === 'moustache' || acc === 'plunger') {
      activeNames.add('Moustache_001');
    } else if (acc === 'moustache2') {
      activeNames.add('Moustache_002');
    } else if (acc === 'clown') {
      activeNames.add('Clown_nose_001');
    } else if (acc === 'pacifier' || acc === 'chef') {
      activeNames.add('Pacifier_001');
      activeNames.add('Clown_nose_001');
    } else if (acc === 'jacket') {
      activeNames.add('Outerwear_029');
    } else if (acc === 'vest') {
      activeNames.add('Outerwear_036');
    } else if (acc === 'costume_hero') {
      activeNames.delete('T_Shirt_009');
      activeNames.delete('Pants_010');
      activeNames.add('Costume_6_001');
    } else if (acc === 'costume_racer') {
      activeNames.delete('T_Shirt_009');
      activeNames.delete('Pants_010');
      activeNames.add('Costume_10_001');
    } else if (acc === 'gloves') {
      activeNames.add('Gloves_006');
    } else if (acc === 'mittens') {
      activeNames.add('Gloves_014');
    } else if (acc === 'shorts') {
      activeNames.delete('Pants_010');
      activeNames.add('Shorts_003');
    } else if (acc === 'cargo') {
      activeNames.delete('Pants_010');
      activeNames.add('Pants_014');
    } else if (acc === 'slippers') {
      activeNames.delete('Shoe_Sneakers_009');
      activeNames.add('Shoe_Slippers_002');
    } else if (acc === 'monster_slippers') {
      activeNames.delete('Shoe_Sneakers_009');
      activeNames.add('Shoe_Slippers_005');
    } else if (acc === 'wavy_hair') {
      activeNames.delete('Hairstyle_male_010');
      activeNames.add('Hairstyle_male_012');
    }

    this.parts.forEach((mesh, name) => {
      mesh.visible = activeNames.has(name);
    });
  }

  public updateCustomization(customization: PlayerCustomization) {
    this.customization = customization;
    this.applyCustomization();
  }

  public playAction(name: string, fadeDuration: number = 0.2) {
    if (!this.mixer) return;
    if (this.currentActionName === name) return;

    const prevAction = this.actions.get(this.currentActionName);
    const nextAction = this.actions.get(name);
    if (!nextAction) return;

    if (prevAction) {
      prevAction.fadeOut(fadeDuration);
    }
    nextAction.reset().fadeIn(fadeDuration).play();
    this.currentActionName = name;
  }

  public animate(
    delta: number,
    isMoving: boolean,
    isRunning: boolean,
    isGrounded: boolean,
    isRagdoll: boolean,
    emote: string | null = null,
    isFarting: boolean = false
  ) {
    if (!this.mixer || !this.isLoaded) return;

    let desiredAction = 'idle';
    let fadeDuration = 0.2;

    if (isRagdoll) {
      desiredAction = 'hit';
      fadeDuration = 0.1;
    } else if (isFarting) {
      desiredAction = 'crouch';
      fadeDuration = 0.15;
    } else if (emote === 'dance') {
      desiredAction = 'dance';
      fadeDuration = 0.2;
    } else if (emote === 'taunt' || emote === 'wave') {
      desiredAction = 'taunt';
      fadeDuration = 0.2;
    } else if (!isGrounded) {
      desiredAction = 'jump';
      fadeDuration = 0.15;
    } else if (isMoving) {
      desiredAction = isRunning ? 'run' : 'walk';
      fadeDuration = 0.18;
    }

    this.playAction(desiredAction, fadeDuration);
    this.mixer.update(delta);
  }

  public dispose() {
    this.isDisposed = true;
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    this.actions.clear();
    this.characterGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      }
    });
  }
}
