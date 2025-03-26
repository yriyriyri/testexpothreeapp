import * as THREE from 'three';
import { EmotionType } from './animation-types';

export class BoxyAnimation {
    public action: THREE.AnimationAction;
    public emotionType: EmotionType;
    public animationClip: THREE.AnimationClip;
    public weight: number;

    constructor(
        emotionType: EmotionType,
        animationClip: THREE.AnimationClip,
        mixer: THREE.AnimationMixer,
        weight: number = 0
    ) {
        this.emotionType = emotionType;
        this.animationClip = animationClip;
        this.weight = weight;
        this.action = mixer.clipAction(animationClip);
        this.action.play();
        this.action.setEffectiveWeight(weight);
    }

    public play() {
        this.action.paused = false;
        this.action.enabled = true;
        return this.action.play();
    }

    public pause() {
        return this.action.paused = true;
    }

    public resume() {
        return this.action.paused = false;
    }

    public setEffectiveWeight(weight: number) {
        this.weight = weight;
        return this.action.setEffectiveWeight(weight);
    }

    public fadeOut(duration: number) {
        return this.action.fadeOut(duration);
    }

    public fadeIn(duration: number) {
        return this.action.fadeIn(duration);
    }

    public crossFadeFrom(boxyAnimation: BoxyAnimation, duration: number, warp: boolean) {
        return this.action.crossFadeFrom(boxyAnimation.action, duration, warp);
    }

    public crossFadeTo(boxyAnimation: BoxyAnimation, duration: number, warp: boolean) {
        return this.action.crossFadeTo(boxyAnimation.action, duration, warp);
    }

    public reset() {
        return this.action.reset();
    }

    public dispose() {
        
    }
}

export class EmoteAnimation extends BoxyAnimation {
    public boundCallback?: (event: any) => void;
    public emoteName: string;
    public emotionType: EmotionType;

    constructor(emoteName: string, emotionType: EmotionType, animationClip: THREE.AnimationClip, mixer: THREE.AnimationMixer) {
        super(emotionType, animationClip, mixer, 0);
        this.emoteName = emoteName;
        this.emotionType = emotionType;
    }
}

export class EmoteAnimationAdditive extends BoxyAnimation {
    public boundCallback?: (event: any) => void;
    public emoteName: string;
    public emotionType: EmotionType;

    constructor(emoteName: string, emotionType: EmotionType, animationClip: THREE.AnimationClip, mixer: THREE.AnimationMixer) {
        super(emotionType, animationClip, mixer, 0);

        this.emoteName = emoteName;
        this.emotionType = emotionType;
        this.action.setEffectiveTimeScale(1)
        THREE.AnimationUtils.makeClipAdditive(animationClip);
        this.action.blendMode = THREE.AdditiveAnimationBlendMode;
    }
}