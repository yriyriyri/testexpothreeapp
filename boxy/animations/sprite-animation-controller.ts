import { SpriteFrame, SpriteAnimation } from './sprite-animation';

export type SpriteAnimationCompleteCallback = () => void;

export class SpriteAnimationController {
    private _currentFrame: number = 0;
    private _intervalId: number | null = null;
    private _spriteAnimation: SpriteAnimation
    private _isPaused: boolean = false;
    private onComplete?: SpriteAnimationCompleteCallback;
    private onFrameUpdate: (frame: SpriteFrame) => void;

    constructor(animation: SpriteAnimation, onFrameUpdate: (frame: SpriteFrame) => void) {
        if (!animation.frames || animation.frames.length === 0) {
            throw new Error('Animation must have frames defined');
        }
        this.onFrameUpdate = onFrameUpdate;
        this._spriteAnimation = animation;
    }

    public start(onComplete?: SpriteAnimationCompleteCallback) {
        this.stop();
        this.onComplete = onComplete;
        this._currentFrame = 0;
        
        const frameInterval = 1000 / this._spriteAnimation.fps;
        this._intervalId = window.setInterval(() => this.update(), frameInterval);

        this.update();
    }

    public stop() {
        if (this._intervalId !== null) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    public pause() {
        this._isPaused = true;
    }

    public resume() {
        this._isPaused = false;
    }

    public update() {
        // console.log("Pause: ", this._isPaused);
        if (this._isPaused) {
            return;
        }
        if (!this._spriteAnimation.frames || this._spriteAnimation.frames.length === 0) {
            console.error('Animation has no frames');
            this.stop();
            return;
        }
    
        if (this._currentFrame >= this._spriteAnimation.frames.length) {
            if (this._spriteAnimation.loop) {
                this._currentFrame = 0;
            } else {
                this.stop();
                this.onComplete?.();
                return;
            }
        }
    
        const frame = this._spriteAnimation.frames[this._currentFrame];
        this.onFrameUpdate(frame);
        this._currentFrame++;
    }

    public getSpriteAnimation() {
        return this._spriteAnimation;
    }

    public dispose() {
        this.stop();
    }
}


