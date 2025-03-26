import * as THREE from "three";
import { SpriteFrame } from "./sprite-animation";

export class SpriteTexture {
    private _texture: THREE.Texture;
    private _rows: number;
    private _columns: number;
    private _material: THREE.MeshStandardMaterial; 

    constructor(
        rows: number,
        columns: number,
        atlas: THREE.Texture,
        material: THREE.MeshStandardMaterial
    ) {
        this._rows = rows;
        this._columns = columns;
        this._material = material;
        // Clone the atlas texture
        this._texture = atlas.clone();
        this._setupTexture();
        this._setupMaterial();
    }

    private _setupTexture() {
        // Configure the texture properties
        this._texture.minFilter = THREE.NearestFilter;
        this._texture.magFilter = THREE.NearestFilter;
        this._texture.name = "BoxyFaceTexture";
        this._texture.flipY = false;
        
        // Initialize the offset and repeat
        this._texture.offset.set(0, 0);
        this._texture.repeat.set(1 / this._columns, 1 / this._rows);
        this._texture.needsUpdate = true;
    }

    private _setupMaterial() {
        // Store the original maps if they exist
        const originalMap = this._material.map;
        const originalEmissiveMap = this._material.emissiveMap;

        // Update material properties
        this._material.map = this._texture;
        this._material.map.minFilter = THREE.NearestFilter;
        this._material.map.magFilter = THREE.NearestFilter;
        this._material.emissiveMap = this._texture;
        this._material.emissive.set(this._material.color);
        this._material.emissiveIntensity = 2.5;
        this._material.metalness = 0.0;
        this._material.roughness = 0.0;
        
        // Dispose of original maps if they exist and are different
        if (originalMap && originalMap !== this._texture) {
            originalMap.dispose();
        }
        if (originalEmissiveMap && originalEmissiveMap !== this._texture) {
            originalEmissiveMap.dispose();
        }

        this._material.needsUpdate = true;
    }

    public updateFrame(frame: SpriteFrame) {
        // Update texture offset for the current frame
        this._texture.offset.x = frame.col / this._columns;
        this._texture.offset.y = frame.row / this._rows; // Flip Y coordinate
        
        // removed due to low FPS on Windows/Chrome
        // this._texture.needsUpdate = true;
    }

    public updateMaterial(newMaterial: THREE.MeshStandardMaterial) {
        this._material = newMaterial;
        this._setupMaterial();
    }

    public dispose() {
        if (this._texture) {
            this._texture.dispose();
        }
    }
}