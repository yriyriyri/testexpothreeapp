// boxy.ts
import * as THREE from "three";
import { Asset } from "expo-asset";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import { BaseBodyPart, PartType } from "./boxy-parts";
import { bodyPartPaths, PaletteData, PaletteManager } from "./boxy-config";

import { BoxyAnimationManager } from "./animations/animation-manager";
import { AnimationHelper } from "./animations/animation-helper";
import { BoxyEventSystem, BoxyEventType } from "./events/boxy-events";
import { EmotionType } from "./animations/animation-types";

export interface BoxyConfig {
  userid: string;
  username: string;
  animation: string;
  facial_expressions: boolean;
  emotion: { x: number; y: number };
  Body: string; 
  Ears: string; 
  Paws: string; 
  paletteIndex: number;
  [key: string]: any;
}

export interface MatProp {
  baseColor: THREE.Color;
  metallic: number;
  roughness: number;
  emissive: THREE.Color;
  emissiveIntensity: number;
  transmission: number;
  alpha: number;
}

export interface PaletteMats {
  materials: MatProp[];
}

export interface PaletteJsonEntry {
  baseColor: { r: number; g: number; b: number };
  metallic: number;
  roughness: number;
  emissive: { r: number; g: number; b: number };
  emissiveIntensity: number;
  transmission: number;
  alpha: number;
  paletteIndex: number;
}

const defaultConfig: BoxyConfig = {
  username: "anon",
  Body: "Body_1",
  Ears: "Ears_1",
  Paws: "Paws_1",
  paletteIndex: 0,
  emotion: { x: 0.2, y: 0 },
  userid: "defaultUser",
  facial_expressions: true,
  animation: "idle",
};

export class Boxy {
  public group: THREE.Group;
  private config: BoxyConfig;
  private localConfig: BoxyConfig;
  private loader: GLTFLoader;
  
  private mixer?: THREE.AnimationMixer;
  private animations: THREE.AnimationClip[] = [];
  private _actions: Map<string, THREE.AnimationAction> = new Map();
  public animationManager?: BoxyAnimationManager;

  private baseSkeleton?: THREE.Skeleton;

  constructor(config: Partial<BoxyConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.localConfig = { ...this.config };

    this.loader = new GLTFLoader();
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = true;
    this.group.visible = false;
  }

  public async load(): Promise<THREE.Group> {
    try {
      const asset = Asset.fromModule(require('../boxy-assets/scenes/base_scene.glb'));
      await asset.downloadAsync();
      const localUri = asset.localUri || asset.uri;
      const gltf = await this.loader.loadAsync(localUri);
      const loadedScene = gltf.scene as THREE.Group;
      
      loadedScene.name = "base_scene";
      
      loadedScene.visible = true;
      loadedScene.position.set(0, 0, 0);
      loadedScene.rotation.set(0, 0, 0);
      loadedScene.scale.set(1, 1, 1);
      loadedScene.updateMatrixWorld(true);
  
      loadedScene.traverse((child) => {
        child.matrixAutoUpdate = true;
        if (child instanceof THREE.SkinnedMesh && !this.baseSkeleton) {
          this.baseSkeleton = child.skeleton;
        }
      });
  
      this.group = new THREE.Group();
      this.group.matrixAutoUpdate = true;
      this.group.visible = false;
      this.group.add(loadedScene);
      this.group.updateMatrixWorld(true);
  
      this.animations = gltf.animations;
      if (this.animations && this.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(loadedScene);
        this.parseAnimations(this.animations);
      }
  
      if (this.mixer) {
        this.mixer.timeScale = 1;
      }
  
      if (this.mixer && this.animations.length > 0) {
        this.animationManager = new BoxyAnimationManager(
          this.group,
          this.mixer,
          this.animations,
          this.config.userid
        );
      
        await this.animationManager.initPromise;
      }
  
      console.log("Base scene loaded. Group children:", this.group.children);
      console.log("Config:", this.config);
  
      setTimeout(async () => {
        await this.applyConfig(this.config);
      
        this.group.children.forEach(child => {
          if (child.name === "base_scene") {
            child.visible = false;
          }
        });
      
        this.group.visible = true;
      }, 0);
  
      return this.group;
    } catch (error) {
      console.error("Error loading Boxy model:", error);
      throw error;
    }
  }

  private parseAnimations(animations: THREE.AnimationClip[]): void {
    if (!this.mixer) return;
    for (const clip of animations) {
      const action = this.mixer.clipAction(clip);
      if (action) {
        this._actions.set(clip.name, action);
      }
    }
  }

  private applyPaletteToObject(object: THREE.Object3D, paletteMats: PaletteMats): void {
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        let materials: THREE.MeshStandardMaterial[] = [];
        if (Array.isArray(mesh.material)) {
          materials = mesh.material.filter(
            (m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial
          );
        } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
          materials = [mesh.material];
        }
        materials.forEach((material) => {
          const matIndex = this.getMaterialIndex(material);
          if (matIndex === null) return;
          const paletteMat = paletteMats.materials[matIndex - 1];
          if (!paletteMat) {
            console.warn("No palette material found for index", matIndex);
            return;
          }
          material.color.copy(paletteMat.baseColor);
          material.metalness = paletteMat.metallic;
          material.roughness = paletteMat.roughness;
          material.emissive.copy(paletteMat.emissive);
          material.emissiveIntensity = paletteMat.emissiveIntensity;
          // Disable transmission to avoid multisample issues:
          if ('transmission' in material) {
            (material as any).transmission = 0;
          }
          material.transparent = false;
          material.opacity = 1;
          material.needsUpdate = true;
        });
      }
    });
  }

  public async applyConfig(newConfig: Partial<BoxyConfig>): Promise<void> {
    const normalizedConfig: BoxyConfig = { ...defaultConfig, ...newConfig };
    console.log("Applying Boxy configuration:", normalizedConfig);
  
    if (normalizedConfig.Body) {
      const variant = Number(normalizedConfig.Body.match(/\d+/)?.[0]) || 0;
      console.log("Body variant extracted:", variant);
      await this.swapBodyPart(PartType.Body, variant);
    }
    if (normalizedConfig.Ears) {
      const variant = Number(normalizedConfig.Ears.match(/\d+/)?.[0]) || 0;
      console.log("Ears variant extracted:", variant);
      await this.swapBodyPart(PartType.Ears, variant);
    }
    if (normalizedConfig.Paws) {
      const variant = Number(normalizedConfig.Paws.match(/\d+/)?.[0]) || 0;
      console.log("Paws variant extracted:", variant);
      await this.swapBodyPart(PartType.Paws, variant);
    }
  
    await this.applyPalette(normalizedConfig.paletteIndex);
  
    if (this.animationManager && this.animationManager.boxyExpressionManager) {
        await this.animationManager.setupExpressionAnimations();
        this.animationManager.boxyExpressionManager.playAnimation(
            EmotionType.Idle,
            () => {
                console.log("Initial expression animation complete");
            }
        );
        this.animationManager.updateEmotionState(
            normalizedConfig.emotion.x,
            normalizedConfig.emotion.y
        );
    }
  
    this.localConfig = normalizedConfig;
    this.group.visible = true;
  }

  public async swapBodyPart(partType: PartType, variant: number): Promise<void> {
    console.log(`Swapping ${partType} to variant ${variant}`);
  
    const mapping = bodyPartPaths[partType];
    if (!mapping) {
      console.warn(`No path mapping defined for part ${partType}`);
      return;
    }
    if (variant < 0 || variant >= mapping.files.length) {
      console.warn(`Variant ${variant} out of bounds for part ${partType}`);
      return;
    }
  
    const assetModule = mapping.files[variant];
    console.log(`Loading new ${partType} part using asset module:`, assetModule);
  
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    const localUri = asset.localUri || asset.uri;
  
    const newPart = new BaseBodyPart(this.loader, partType, partType);
    await newPart.loadPartFromFile(localUri);
    const meshGroups = newPart.getMeshGroups();
    console.log(`Loaded mesh groups for ${partType}:`, meshGroups);
  
    const paletteData: PaletteData | undefined = PaletteManager.getPaletteById(this.localConfig.paletteIndex);
    if (paletteData) {
      const paletteJson: { [key: string]: PaletteJsonEntry } = paletteData.jsonPath;
      const paletteEntries: PaletteJsonEntry[] = Object.values(paletteJson);
      const paletteMats: PaletteMats = { materials: [] };
      paletteEntries.forEach((entry) => {
        const matProp: MatProp = {
          baseColor: new THREE.Color(entry.baseColor.r, entry.baseColor.g, entry.baseColor.b),
          metallic: entry.metallic,
          roughness: entry.roughness,
          emissive: new THREE.Color(entry.emissive.r, entry.emissive.g, entry.emissive.b),
          emissiveIntensity: entry.emissiveIntensity,
          transmission: entry.transmission,
          alpha: entry.alpha,
        };
        paletteMats.materials.push(matProp);
      });
      meshGroups.forEach((meshGroup) => {
        this.applyPaletteToObject(meshGroup.rootNode, paletteMats);
      });
    }
  
    const oldPart = this.group.getObjectByName(partType);
    if (oldPart?.parent) {
      this.removeOldParts(oldPart.parent, partType);
      console.log(`Removed old ${partType} parts.`);
    }
  
    meshGroups.forEach((meshGroup) => {
      meshGroup.rootNode.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && this.baseSkeleton) {
          const originalBindMatrix = child.bindMatrix.clone();
          child.skeleton = this.baseSkeleton;
          child.bind(child.skeleton, originalBindMatrix);
        }
      });
      meshGroup.rootNode.name = partType;
      this.group.add(meshGroup.rootNode);
      console.log(`Added new ${partType} part:`, meshGroup.rootNode);
    });
  
    this.localConfig[partType] = `${partType}_${variant}`;
    console.log(`Swapped ${partType} to variant ${variant}`);
  
    BoxyEventSystem.getInstance().emit(BoxyEventType.BodyPartChanged, {
      instanceId: this.config.userid,
      partType: partType,
      partName: partType
    });
  }

  public async applyPalette(paletteIndex: number): Promise<void> {
    const paletteData: PaletteData | undefined = PaletteManager.getPaletteById(paletteIndex);
    if (!paletteData) {
      console.warn("No palette data found for index", paletteIndex);
      return;
    }
  
    try {
      const paletteJson: { [key: string]: PaletteJsonEntry } = paletteData.jsonPath;
      const paletteEntries: PaletteJsonEntry[] = Object.values(paletteJson);
  
      const paletteMats: PaletteMats = { materials: [] };
      paletteEntries.forEach((entry) => {
        const matProp: MatProp = {
          baseColor: new THREE.Color(entry.baseColor.r, entry.baseColor.g, entry.baseColor.b),
          metallic: entry.metallic,
          roughness: entry.roughness,
          emissive: new THREE.Color(entry.emissive.r, entry.emissive.g, entry.emissive.b),
          emissiveIntensity: entry.emissiveIntensity,
          transmission: entry.transmission,
          alpha: entry.alpha,
        };
        paletteMats.materials.push(matProp);
      });
  
      this.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          let materials: THREE.MeshStandardMaterial[] = [];
          if (Array.isArray(mesh.material)) {
            materials = mesh.material.filter(
              (m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial
            );
          } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
            materials = [mesh.material];
          }
          materials.forEach((material) => {
            const matIndex = this.getMaterialIndex(material);
            if (matIndex === null) return;
            const paletteMat = paletteMats.materials[matIndex - 1];
            if (!paletteMat) {
              console.warn("No palette material found for index", matIndex);
              return;
            }
            material.color.copy(paletteMat.baseColor);
            material.metalness = paletteMat.metallic;
            material.roughness = paletteMat.roughness;
            material.emissive.copy(paletteMat.emissive);
            material.emissiveIntensity = paletteMat.emissiveIntensity;
            material.transparent = paletteMat.transmission > 0;
            material.opacity = paletteMat.transmission;
            material.needsUpdate = true;
          });
        }
      });
  
      this.localConfig.paletteIndex = paletteIndex;
    } catch (error) {
      console.error("Error applying palette JSON:", error);
    }
  }

  public updateEmotionState(x: number, y: number): void {
    if (this.animationManager) {
      this.animationManager.updateEmotionState(x, y);
    }
    this.localConfig.emotion = { x, y };
  }

  public update(delta: number): void {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  public getLocalConfig(): BoxyConfig {
    return this.localConfig;
  }

  private removeOldParts(parent: THREE.Object3D, partName: string): void {
    const toRemove: THREE.Object3D[] = [];
    parent.traverse((child) => {
      if (child.name === partName) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((child) => {
      if (child.parent) {
        child.parent.remove(child);
      }
    });
  }

  private getMaterialIndex(material: THREE.MeshStandardMaterial): number | null {
    const match = material.name.match(/^Material_Mv_.*?_(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }
}