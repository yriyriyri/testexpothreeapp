import * as THREE from 'three';
import { EmotionSpace } from './emotion-space';
import { EmotionState , EmotionType } from './animation-types';
import { BoxyAnimation, EmoteAnimation, EmoteAnimationAdditive } from './boxy-animation';

// Configuration type for animation settings
interface AnimationConfig {
    emotionStableThreshold: number;
    fadeDuration: number;
    emoteMinInterval: number;
    emoteDelay: number;
    emoteChance: number;
}

// State management for emotion transitions
class EmoteStateManager {
    private _stableTime: number = 0;
    private _lastChangeTime: number = 0;
    private _position: THREE.Vector2 = new THREE.Vector2(99, 99);
    private _config: AnimationConfig;
    
    constructor(position: THREE.Vector2, config: AnimationConfig) {
        this._position = position;
        this._config = config;
    }

    public update(delta: number): boolean {
        this._stableTime += delta;
        return this.canPlayEmote();
    }

    public canPlayEmote(): boolean {
        const timeElapsed = Date.now() - this._lastChangeTime;
        return this._stableTime >= this._config.emotionStableThreshold && 
               timeElapsed >= this._config.emoteMinInterval * 1000;
    }

    public updatePosition(x: number, y: number): boolean {
        if (this._position.x === x && this._position.y === y) return false;
        
        this._position.set(x, y);
        this._stableTime = 0;
        this._lastChangeTime = Date.now();
        return true;
    }

    public getPosition(): THREE.Vector2 {
        return this._position.clone();
    }
}

export class AnimationHelper {
    private _emoteStateManager: EmoteStateManager;
    private _emotionSpace: EmotionSpace;
    private _boxyAnimations: Map<EmotionType, BoxyAnimation> = new Map();
    private _currentAnimations: BoxyAnimation[] = [];
    private _currentEmote: EmoteAnimation | null = null;
    private _isTransitioning: boolean = false;
    private _timeSinceLastEmote: number = 0;
    private _isPaused: boolean = false;
    private _enableEmotes: boolean = true;
    private _updateHandlers: Set<(delta: number) => void> = new Set();
    private _originalWeights: Map<EmotionType, number> = new Map();

    private _config: AnimationConfig = {
        emotionStableThreshold: 3.0,
        fadeDuration: 0.3,
        emoteMinInterval: 3.0,
        emoteDelay: 3.0,
        emoteChance: 0.01
    };

    constructor(private mixer: THREE.AnimationMixer) {
        this._emotionSpace = new EmotionSpace();
        this._emoteStateManager = new EmoteStateManager(new THREE.Vector2(99, 99), this._config);
    }

    public prepareEmote( idleActions: BoxyAnimation[], emoteAction: EmoteAnimation) {
        this.resume();
        this.synchronizeEmote( idleActions, emoteAction );
    }

    private synchronizeEmote( idleActions: BoxyAnimation[], emoteAction: EmoteAnimation ) {
        const onLoopFinished = (event: THREE.Event & { 
            action: THREE.AnimationAction; 
            loopDelta: number;
        }) => {
            if (event.action === idleActions[0].action) {
                // console.log('Loop finished:', event.action.getClip().name);
                this.mixer.removeEventListener('loop', onLoopFinished);
                this.executeEmote(emoteAction);
            }
        };
        this.mixer.addEventListener( 'loop', onLoopFinished );
    }

    public playEmote( emoteAction: EmoteAnimation ) {
        this._setupAndPlayEmote( emoteAction );
    }

    public executeEmote(emoteAction: EmoteAnimation) {
        emoteAction.reset();
        this._setupAndPlayEmote(emoteAction);
    }

    private async _playRandomEmote() {
        if (this._isTransitioning) return;
        this._isTransitioning = true;

        const emote = this._selectRandomEmote();
        if (!emote) return;
        this._currentEmote = emote;

        try {
            this.prepareEmote(this._currentAnimations, emote );
        } catch (error) {
            console.error('Error during emote transition:', error);
        } finally {
            this._isTransitioning = false;
        }
    }

    private _selectRandomEmote(): EmoteAnimation | null {
        const currentEmotions = this._emotionSpace.getCurrentEmotions();
        if (!currentEmotions) return null;

        const availableEmotes = this._emotionSpace.getAvailableEmotes();
        
        if (!availableEmotes?.length) return null;

        return availableEmotes[Math.floor(Math.random() * availableEmotes.length)];
    }


    // Modify your existing update method to include the handlers
    public update(delta: number) {
        if (this._isPaused || !this._enableEmotes) return;
        
        this.mixer.update(delta);
        this._timeSinceLastEmote += delta;
        
        // Run all update handlers
        if (this._updateHandlers.size > 0) {
            this._updateHandlers.forEach(handler => handler(delta));
        }
        
        if (this._isTransitioning || this._currentEmote) {
            this._timeSinceLastEmote = 0;
            return;
        }

        if (this._timeSinceLastEmote <= this._config.emoteDelay) return;

        if (this._emoteStateManager.update(delta) && Math.random() < this._config.emoteChance) {
            // console.log('Playing random emote');
            this._config.fadeDuration = delta * 10;
            // console.log('Emote delay:', this._config.fadeDuration);
            this._playRandomEmote();

        }
    }

    public addEmotion(emotionType: EmotionType, x: number, y: number, animationClip: THREE.AnimationClip, emotes?: THREE.AnimationClip[]) {
        const emoteAnimations = emotes?.map(clip => {
            if (clip.name.includes('add')) {
                return new EmoteAnimationAdditive(clip.name, emotionType, clip, this.mixer);
            } else {
                return new EmoteAnimation(clip.name, emotionType, clip, this.mixer)
            }

        }
        );
        this._emotionSpace.addEmotion(emotionType, x, y, animationClip, emoteAnimations);
        this._boxyAnimations.set(emotionType, new BoxyAnimation(emotionType, animationClip, this.mixer));
    }

    public toggleEmotes(enable: boolean) {
        this._enableEmotes = enable;
    }

    public resume() {
        this._isPaused = false;
        this._currentAnimations.forEach(anim => anim.resume());
        if (this._currentEmote) {
            this._currentEmote.resume();
        }
    }

    public pause() {
        this._isPaused = true;
        this._currentAnimations.forEach(anim => anim.pause());
        if (this._currentEmote) {
            this._currentEmote.pause();
        }
    }

    public updateEmotionPosition(x: number, y: number) {
        if (!this._emoteStateManager.updatePosition(x, y)) return;
        
        if (this._currentEmote) {
            this.cancelEmote();
        }
        this._updateBlending();
    }

    public cancelEmote() {
        if (!this._currentEmote) return;
        this._currentEmote.action.weight = 0;
        this._currentEmote = null;
    }

    public getMaxWeightAnimation(): BoxyAnimation {
        return this._currentAnimations.reduce(
            (max, anim) => max.weight > anim.weight ? max : anim,
            this._currentAnimations[0]
        );
    }

    public getCurrentAnimations(): BoxyAnimation[] {
        return this._currentAnimations;
    }

    public dispose() {
        if (this._currentEmote) {
            this._handleEmoteFinished();
        }
    }

    private async _setupAndPlayEmote(emote: EmoteAnimation) {
        // console.log('Playing emote:', emote.animationClip.name);
        this._currentEmote = emote;
        if (!this._currentEmote) {
            console.error('No current emote found');
            return;
        }
        // Set up loop finished handler
        const onLoopFinished = (event: THREE.Event & { 
            action: THREE.AnimationAction; 
            loopDelta: number;
        }) => {
            if (!this._currentEmote) {
                this.mixer.removeEventListener('loop', onLoopFinished);
                return;
            }
            if (event.action === this._currentEmote!.action) {
                this.mixer.removeEventListener('loop', onLoopFinished);
                this._handleEmoteFinished();
            }
        };
        
        this.mixer.addEventListener('loop', onLoopFinished);
        
        // Store original weights for restoration
        this._originalWeights = new Map<EmotionType, number>();
        this._currentAnimations.forEach(anim => {
            this._originalWeights.set(anim.emotionType, anim.weight);
        });
        
        // Prepare the emote animation
        emote.action.enabled = true;
        emote.action.setEffectiveTimeScale(1);
        emote.action.setEffectiveWeight(0);
        emote.play();
        
        // Create a transition controller
        let elapsed = 0;
        const duration = this._config.fadeDuration;
        
        const updateWeights = (delta: number) => {
            if (!this._currentEmote) return;
            
            elapsed += delta;
            const alpha = Math.min(elapsed / duration, 1);
            
            // Fade out current animations
            if (!(this._currentEmote instanceof EmoteAnimationAdditive)) {
                this._currentAnimations.forEach(anim => {
                    const originalWeight = this._originalWeights.get(anim.emotionType) || 0;
                    anim.setEffectiveWeight(originalWeight * (1 - alpha));
                });
            }

            
            // Fade in emote
            emote.setEffectiveWeight(alpha);
            
            if (alpha === 1) {
                // Remove the update handler from our class update cycle
                this._updateHandlers.delete(updateWeights);
            }
        };
        
        // Add the update handler to our class
        this._updateHandlers.add(updateWeights);
    }

    private async _handleEmoteFinished() {
        if (!this._currentEmote || this._isTransitioning) return;
        // console.log('Stopping emote:', this._currentEmote.animationClip.name);
        this._isTransitioning = true;
        
        try {
            const emote = this._currentEmote;
            const duration = this._config.fadeDuration;
            let elapsed = 0;
            
            // Store final weights for restoration
            const targetWeights = new Map<EmotionType, number>();
            this._currentAnimations.forEach(anim => {
                const emotionState = this._emotionSpace.getCurrentEmotions()
                    .find(e => e.emotion.emotionType === anim.emotionType);
                if (emotionState) {
                    targetWeights.set(anim.emotionType, this._originalWeights.get(anim.emotionType) || 0);
                }
            });
            
            
            const updateWeights = (delta: number) => {
                elapsed += delta;
                const alpha = Math.min(elapsed / duration, 1);
                
                // Fade in original animations
                if (!(emote instanceof EmoteAnimationAdditive)) {
                    this._currentAnimations.forEach(anim => {
                        const targetWeight = targetWeights.get(anim.emotionType) || 0;
                        anim.setEffectiveWeight(targetWeight * alpha);
                    });
                }
                // Fade out emote
                emote.setEffectiveWeight(1 - alpha);
                
                if (alpha === 1) {
                    this._updateHandlers.delete(updateWeights);
                    emote.action.stop();
                    this._currentEmote = null;
                }
            };
            
            this._updateHandlers.add(updateWeights);
            
        } catch (error) {
            console.error('Error during emote finish:', error);
        } finally {
            this._isTransitioning = false;
        }
    }

    private _updateBlending() {
        const position = this._emoteStateManager.getPosition();
        const closestEmotions = this._emotionSpace.getClosestEmotions(position, 2);
        const hasExactMatch = closestEmotions.some(e => e.distance === 0);
        const totalWeight = hasExactMatch ? 1 : this._calculateTotalWeight(closestEmotions);

        this._resetAnimationWeights();
        this._updateAnimationWeights(closestEmotions, hasExactMatch, totalWeight);
    }

    private _calculateTotalWeight(emotions: { distance: number }[]): number {
        return emotions.reduce((sum, e) => sum + (1 / e.distance), 0);
    }

    private _resetAnimationWeights() {
        this._boxyAnimations.forEach(anim => anim.setEffectiveWeight(0));
    }

    private _updateAnimationWeights(
        emotions: { emotion: EmotionState, distance: number }[],
        hasExactMatch: boolean,
        totalWeight: number
    ) {
        this._currentAnimations = emotions.map(({ emotion, distance }) => {
            const weight = hasExactMatch ? (distance === 0 ? 1 : 0) : ( 1 / distance) / totalWeight;
            const animation = this._boxyAnimations.get(emotion.emotionType)!;
            animation.setEffectiveWeight(weight);
            if (!this._isPaused) {
                animation.play();
            }
            return animation;
        });
        // print current animations and their weight on one line
        console.log(this._currentAnimations.map(anim => `${anim.emotionType}: ${anim.action.weight}`).join(' | '));
    }
}