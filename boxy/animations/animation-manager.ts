import * as THREE from "three";
import { AnimationHelper } from "./animation-helper";
import { EmotionType } from "./animation-types";
import { BoxyEventSystem, BoxyEventType, BoxyEventMap } from "../events/boxy-events";
import { BoxyExpressionManager } from "./boxy-expression-manager";
import { Asset } from 'expo-asset';

class BoxyAnimationManager {
    public boxyExpressionManager!: BoxyExpressionManager;
    public screenMaterialNamePattern: RegExp = /Material_Screen\b/;
    private _animationHelper: AnimationHelper;
    private _eventSystem: BoxyEventSystem;
    private _group: THREE.Group; 
    private _animations: THREE.AnimationClip[];
    private _mixer: THREE.AnimationMixer;
    private _instanceId: string; 
    public initPromise: Promise<void>;
  
    constructor(
      group: THREE.Group, 
      mixer: THREE.AnimationMixer,
      animations: THREE.AnimationClip[],
      instanceId: string 
    ) {
      this._instanceId = instanceId;
      this._animationHelper = new AnimationHelper(mixer);
      this._eventSystem = BoxyEventSystem.getInstance();
      this._group = group; 
      this._animations = animations;
      this._mixer = mixer;
      this._setupAnimations(animations);
  
      this._eventSystem.subscribe(BoxyEventType.EmotionStateChanged, this._onEmotionStateChanged.bind(this));
      this._eventSystem.subscribe(BoxyEventType.BodyPartChanged, this._onBodyPartChanged.bind(this));
  
      this.initPromise = this._initExpressionManager();
    }
  
    private async _initExpressionManager() {
      const spriteSheetAsset = Asset.fromModule(
        require("../../boxy-assets/textures/boxy-sprite-sheet.png")
      );
  
      await spriteSheetAsset.downloadAsync(); // CRITICAL: await this call first!
  
      const spriteSheetSize = { rows: 9, columns: 20 };
  
      this.boxyExpressionManager = new BoxyExpressionManager(
        this._group,
        spriteSheetAsset.localUri || spriteSheetAsset.uri,
        this.screenMaterialNamePattern,
        spriteSheetSize,
        this._instanceId
      );
  
      await this.boxyExpressionManager.initPromise;
  
      // Now safely proceed with animations:
      await this.setupExpressionAnimations();
      this.boxyExpressionManager.playAnimation(
        EmotionType.Idle,
        () => {
          console.log("Initial expression animation complete");
        }
      );
  
      this.playEntranceAnimation();
      this.updateEmotionState(0, 0);
    }

  private _onEmotionStateChanged(data: BoxyEventMap[BoxyEventType.EmotionStateChanged]) {
    if (data.instanceId !== this._instanceId) return;
    console.log(`Received EmotionStateChanged event for instance ${data.instanceId}`);
  }

  private _onBodyPartChanged(data: BoxyEventMap[BoxyEventType.BodyPartChanged]) {
    if (data.instanceId !== this._instanceId) return;
    console.log(`Received BodyPartChanged event for instance ${data.instanceId}`);
  }

  public playEntranceAnimation() {
    const entranceAnim = this._animations.find((anim) => anim.name === "emote_entrance");
    if (entranceAnim) {
      const action = this._mixer.clipAction(entranceAnim);
      action.setLoop(THREE.LoopOnce, 1);
      action.setEffectiveWeight(1).play();
      action.fadeOut(entranceAnim.duration);
    }
  }

  public update(delta: number) {
    this._animationHelper.update(delta);
  }

  private _setupAnimations(animations: THREE.AnimationClip[]) {
    const emotes = animations.filter((anim) => anim.name.includes("emote_"));
    const emotions = [
      { emotionType: EmotionType.Happy, x: 1, y: 0, animName: "idle_happy", emotes: emotes.filter(e => e.name.includes("happy")) },
      { emotionType: EmotionType.Sad, x: -1, y: 0, animName: "idle_sad", emotes: emotes.filter(e => e.name.includes("sad")) },
      { emotionType: EmotionType.Energetic, x: 0, y: 1, animName: "idle_energetic", emotes: emotes.filter(e => e.name.includes("energetic")) },
      { emotionType: EmotionType.Lazy, x: 0, y: -1, animName: "idle_lazy", emotes: emotes.filter(e => e.name.includes("lazy")) },
      { emotionType: EmotionType.Idle, x: 0, y: 0, animName: "idle", emotes: emotes.filter(e => !e.name.match(/happy|sad|lazy|energetic|entrance/)) },
    ];

    this._addEmotions(emotions, animations);
  }

  public async setupExpressionAnimations(): Promise<void> {
    await this.boxyExpressionManager.registerAnimations([
      { emotionType: EmotionType.Happy, startIndex: { row: 0, col: 0 }, endIndex: { row: 2, col: 19 }, fps: 12, loop: true },
      { emotionType: EmotionType.Energetic, startIndex: { row: 3, col: 0 }, endIndex: { row: 3, col: 19 }, fps: 12, loop: true },
      { emotionType: EmotionType.Sad, startIndex: { row: 4, col: 0 }, endIndex: { row: 4, col: 19 }, fps: 12, loop: true },
      { emotionType: EmotionType.Lazy, startIndex: { row: 5, col: 0 }, endIndex: { row: 5, col: 19 }, fps: 12, loop: true },
      { emotionType: EmotionType.Idle, startIndex: { row: 0, col: 0 }, endIndex: { row: 2, col: 19 }, fps: 12, loop: true },
    ]);
  }

  public updateEmotionState(x: number, y: number) {
    this._animationHelper.updateEmotionPosition(x, y);
    this._eventSystem.emit(BoxyEventType.EmotionStateChanged, {
      instanceId: this._instanceId,
      emotionPoint: new THREE.Vector2(x, y),
      animation: this._animationHelper.getMaxWeightAnimation(),
    });
  }

  public resume() { this._animationHelper.resume(); }
  public pause() { this._animationHelper.pause(); }

  private _addEmotions(
    emotions: {
      emotionType: EmotionType;
      x: number;
      y: number;
      animName: string;
      emotes?: THREE.AnimationClip[];
    }[],
    animations: THREE.AnimationClip[]
  ) {
    emotions.forEach((emotion) => {
      const animationClip = animations.find(
        (anim) => anim.name === emotion.animName
      );
      if (animationClip) {
        this._animationHelper.addEmotion(
          emotion.emotionType,
          emotion.x,
          emotion.y,
          animationClip,
          emotion.emotes
        );
      }
    });
  }

  public dispose() {
    this._animationHelper.dispose();
    this.boxyExpressionManager.dispose();
  }
}

export { BoxyAnimationManager };
