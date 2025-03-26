import * as THREE from 'three';
import { EmoteAnimation } from './boxy-animation'

export enum EmotionType {
    Idle = "Idle",
    Happy = "Happy",
    Sad = "Sad",
    Energetic = "Energetic",
    Lazy = "Lazy",
}

export interface EmotionState {
    emotionType: EmotionType;
    position: THREE.Vector2;
    animation: THREE.AnimationClip;
    emotes?: EmoteAnimation[];
}