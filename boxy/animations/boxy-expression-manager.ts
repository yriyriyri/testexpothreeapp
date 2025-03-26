import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { TextureLoader as ExpoTextureLoader } from 'expo-three';
import { BoxyEventSystem, BoxyEventType } from '../events/boxy-events';
import { SpriteFrame, SpriteAnimation } from './sprite-animation';
import { SpriteAnimationController, SpriteAnimationCompleteCallback } from './sprite-animation-controller';
import { SpriteTexture } from './sprite-texture';
import { EmotionType } from './animation-types';


export class BoxyExpressionManager {
    private _textureManager?: SpriteTexture;
    private _currentSpriteAnimation?: SpriteAnimationController;
    private _spriteAnimations: Map<EmotionType, SpriteAnimation> = new Map();
    private _eventSystem: BoxyEventSystem;
    private _isInitialized: boolean = false;
    private _group: THREE.Group; 
    private _atlasPath: string;
    private _screenMaterialNamePattern: RegExp;
    private _config: {
        rows: number;
        columns: number;
    };
    private _isPaused: boolean = false;
    private _instanceId: string; 
    public initPromise: Promise<void>;

    constructor(
        group: THREE.Group, 
        atlasPath: string,
        screenMaterialNamePattern: RegExp,
        config: { rows: number; columns: number; },
        instanceId: string 
    ) {
        this._group = group;
        this._atlasPath = atlasPath;
        this._screenMaterialNamePattern = screenMaterialNamePattern;
        this._config = config;
        this._instanceId = instanceId; 
        this._eventSystem = BoxyEventSystem.getInstance();
        this.initPromise = this._init();
    }

    private async _init() {
        try {
            await this._loadAtlasTexture();
            this._setupEventListeners();
            this._isInitialized = true;
            console.log("Expression manager initialized successfully");
        } catch (error) {
            console.error("Error initializing expression manager:", error);
            this._isInitialized = false;
        }
    }

    private async _loadAtlasTexture(): Promise<void> {
        try {
          console.log("TextureLoader is from:", ExpoTextureLoader?.toString());
          const asset = Asset.fromModule(require("../../boxy-assets/textures/boxy-sprite-sheet.png"));
          await asset.downloadAsync();
      
          console.log("Asset localUri:", asset.localUri);
      
          if (!asset.localUri && !asset.uri) {
            throw new Error("Asset localUri and uri are undefined.");
          }
      
          const uri = Platform.select({
            ios: asset.localUri || asset.uri,
            android: asset.localUri?.startsWith('file://') 
              ? asset.localUri 
              : `file://${asset.localUri || asset.uri}`,
          });
      
          console.log("Resolved texture URI:", uri);
      
          const texture = await new ExpoTextureLoader().loadAsync(uri!);
      
          texture.flipY = false;
          texture.minFilter = THREE.NearestFilter;
          texture.magFilter = THREE.NearestFilter;
          texture.needsUpdate = true;
      
          const material = this._findFaceMaterial();
          console.log("Face material found:", material?.name, material?.map);
          if (!material) {
            throw new Error("Face material not found");
          }
      
          this._textureManager = new SpriteTexture(
            this._config.rows,
            this._config.columns,
            texture,
            material
          );
      
          console.log("Texture manager initialized successfully.");
        } catch (error) {
          console.error("Failed to load atlas texture:", error);
          throw error;
        }
    }

    private _findFaceMaterial(): THREE.MeshStandardMaterial | null {
        let faceMaterial: THREE.MeshStandardMaterial | null = null;
        this._group.traverse((object) => {
            if (!(object instanceof THREE.Mesh || object instanceof THREE.SkinnedMesh)) return;
            if (object.parent?.name !== "Body") return;
            let material = object.material as THREE.MeshStandardMaterial;
            if (this._screenMaterialNamePattern.test(material.name)) {
                faceMaterial = material;
            }
        });
        return faceMaterial;
    }

    private _setupEventListeners() {
        this._eventSystem.subscribe(BoxyEventType.BodyPartChanged, (data) => {
            if (data.instanceId !== this._instanceId) return;
            const material = this._findFaceMaterial();
            if (material && this._textureManager) {
                this._textureManager.updateMaterial(material);
            }
        });

        this._eventSystem.subscribe(BoxyEventType.EmotionStateChanged, (data) => {
            if (data.instanceId !== this._instanceId) return;
            if (data.animation) {
                this.playAnimation(data.animation.emotionType);
            }
        });
    }

    private _generateFramesFromIndices(startIndex: { row: number; col: number }, endIndex: { row: number; col: number }): SpriteFrame[] {
        const frames: SpriteFrame[] = [];
        const rowStep = startIndex.row <= endIndex.row ? 1 : -1;
        for (let row = startIndex.row; rowStep > 0 ? row <= endIndex.row : row >= endIndex.row; row += rowStep) {
            const colStart = row === startIndex.row ? startIndex.col : 0;
            const colEnd = row === endIndex.row ? endIndex.col : this._config.columns - 1;
            const colStep = colStart <= colEnd ? 1 : -1;
            for (let col = colStart; colStep > 0 ? col <= colEnd : col >= colEnd; col += colStep) {
                frames.push({ row, col });
            }
        }
        return frames;
    }

    public async registerAnimation(animation: SpriteAnimation): Promise<void> {
        if (!animation.emotionType) {
            throw new Error('Sprite Animation must have a valid type');
        }
        if (!this._isInitialized) await this._init();

        if (animation.startIndex && animation.endIndex) {
            animation.frames = this._generateFramesFromIndices(animation.startIndex, animation.endIndex);
        }
        if (!animation.frames || animation.frames.length === 0) {
            throw new Error('Sprite animation must have frames defined or valid start/end indices');
        }

        this._spriteAnimations.set(animation.emotionType, animation);
    }

    public async registerAnimations(animations: SpriteAnimation[]): Promise<void> {
        await Promise.all(animations.map(animation => this.registerAnimation(animation)));
    }

    public async playAnimation(
        emotionType: EmotionType, 
        onComplete?: SpriteAnimationCompleteCallback
    ): Promise<void> {
        if (!this._isInitialized || !this._textureManager) {
            console.warn('Expression manager or Texture manager not initialized; skipping animation playback.');
            return;
        }

        const animation = this._spriteAnimations.get(emotionType);
        if (!animation) {
            console.warn(`Sprite animation "${emotionType}" not found; skipping.`);
            return;
        }

        this.stopAnimation();
        this._currentSpriteAnimation = new SpriteAnimationController(
            animation,
            frame => this._textureManager!.updateFrame(frame)
        );
        if (this._isPaused) {
            this._currentSpriteAnimation.pause();
        }
        this._currentSpriteAnimation.start(onComplete);
    }

    public pauseAnimation(): void {
        this._isPaused = true;
        this._currentSpriteAnimation?.pause();
    }

    public resumeAnimation(): void {
        this._isPaused = false;
        this._currentSpriteAnimation?.resume();
    }

    public stopAnimation(): void {
        this._currentSpriteAnimation?.stop();
        this._currentSpriteAnimation = undefined;
    }

    public dispose(): void {
        this.stopAnimation();
        this._textureManager?.dispose();
    }
}