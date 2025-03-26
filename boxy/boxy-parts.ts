// boxy-parts.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export enum PartType {
  Body = "Body",
  Ears = "Ears",
  Paws = "Paws",
}

export interface BodyPartPaths {
  root: string;
  files: any[];
}

export interface PartMeshGroup {
  rootNode: THREE.Object3D;
  meshes: THREE.SkinnedMesh[];
}

export class BaseBodyPart {
  protected loader: GLTFLoader;
  protected meshGroups: { [name: string]: PartMeshGroup } = {};
  private _keyword: string;
  private _pattern: RegExp;
  private _partType: PartType;

  constructor(loader: GLTFLoader, keyword: string, partType: PartType) {
    this.loader = loader;
    this._keyword = keyword; 
    this._partType = partType; 
    this._pattern = new RegExp(`${this._keyword}`);
    return;
  }

  public getType(): PartType {
    return this._partType;
  }

  public getSkeleton(): THREE.Skeleton | null {
    return this.meshGroups[Object.keys(this.meshGroups)[0]].meshes[0].skeleton;
  }

  public async loadPartFromFile(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const clonedScene = gltf.scene.clone(true);
          this._parseScene(clonedScene);
          resolve();
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  public getKeyword(): string {
    return this._keyword;
  }

  public loadPartFromScene(scene: THREE.Object3D): void {
    this._parseScene(scene);
  }

  private isValidName(name: string): boolean {
    return this._pattern.test(name);
  }

  private findPartMeshes(node: THREE.Object3D): THREE.SkinnedMesh[] {
    const meshes: THREE.SkinnedMesh[] = [];
    node.traverse((child) => {
      if (
        child instanceof THREE.SkinnedMesh &&
        child.parent?.name.includes(this._keyword)
      ) {
        meshes.push(child);
      }
    });
    return meshes;
  }

  private _parseScene(scene: THREE.Object3D): void {
    const meshes = this.findPartMeshes(scene);
    for (const mesh of meshes) {
      const parent = mesh.parent!;
      if (this.isValidName(parent.name)) {
        if (!this.meshGroups[parent.name]) {
          this.meshGroups[parent.name] = {
            rootNode: parent,
            meshes: [],
          };
        }
        if (mesh.type === 'SkinnedMesh') {
          mesh.frustumCulled = false;
        }
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this.meshGroups[parent.name].meshes.push(mesh);
      }
    }
    if (meshes.length === 0) {
      console.warn(`No meshes found for ${this._keyword}`);
    }
  }

  public getMeshGroups(): PartMeshGroup[] {
    return Object.values(this.meshGroups);
  }

  public getMeshGroup(baseBodyPart: BaseBodyPart): PartMeshGroup {
    return this.meshGroups[baseBodyPart.getKeyword()];
  }
}
