import * as THREE from 'three';
import { EmotionState, EmotionType } from './animation-types';
import { EmoteAnimation } from './boxy-animation';


export class EmotionSpace {
    private _emotions: EmotionState[] = [];
    private _currentEmotions: { emotion: EmotionState, distance: number }[] = [];
    private readonly IDLE_WEIGHT_FACTOR = 3.0;

    public addEmotion(emotionType: EmotionType, x: number, y: number, animation: THREE.AnimationClip, emotes?: EmoteAnimation[]): EmotionState {
        const emotion: EmotionState = { 
            emotionType: emotionType, 
            position: new THREE.Vector2(x, y), 
            animation,
            emotes
        };
        this._emotions.push(emotion);
        return emotion;
    }

    public getClosestEmotions(position: THREE.Vector2, count: number = 2): { emotion: EmotionState, distance: number }[] {
        this._currentEmotions = this._emotions
            .map(emotion => ({
                emotion,
                distance: this.calculateWeightedDistance(position, emotion)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count);
        return this._currentEmotions;
    }

    private calculateWeightedDistance(position: THREE.Vector2, emotion: EmotionState): number {
        const rawDistance = position.distanceTo(emotion.position);
        
        // Apply weight factor to idle animation
        if (emotion.emotionType === EmotionType.Idle) {
            return rawDistance * this.IDLE_WEIGHT_FACTOR;
        }
        
        return rawDistance;
    }
    
    public getEmotions(): EmotionState[] {
        return this._emotions;
    }

    public getCurrentEmotions(): { emotion: EmotionState, distance: number }[] {
        return this._currentEmotions;
    }

    // gets all emotes that match either of the current emotions
    public getAvailableEmotes(): EmoteAnimation[] {    
        const temp = this._currentEmotions.reduce((acc, { emotion }) => {
            if (emotion.emotes) {
                acc.push(...emotion.emotes);
            }
            return acc;
        }, [] as EmoteAnimation[]);

        // check if one of the current emotions is idle
        const hasIdle = this._currentEmotions.some(({ emotion }) => emotion.emotionType === EmotionType.Idle);

        // add idle emotes
        if (!hasIdle) {
            this._emotions.forEach(emotion => {
                if (emotion.emotionType === EmotionType.Idle) {
                    temp.push(...emotion.emotes!);
                }
            });
        }
        return temp;
    }



}