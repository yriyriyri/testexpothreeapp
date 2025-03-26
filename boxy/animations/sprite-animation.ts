import { EmotionType } from "./animation-types";

export interface SpriteFrame {
    row: number;
    col: number;
}

export interface SpriteAnimation {
    emotionType: EmotionType;
    frames?: SpriteFrame[];
    startIndex?: {
        row: number;
        col: number;
    };
    endIndex?: {
        row: number;
        col: number;
    };
    fps: number;
    loop?: boolean;
}