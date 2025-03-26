import { Vector2 } from 'three';
import { PartType } from '../boxy-parts';
import { BoxyAnimation } from '../animations/boxy-animation';

export enum BoxyEventType {
  BodyPartChanged = 'bodyPartChanged',
  EmotionStateChanged = 'emotionStateChanged'
}

export interface BoxyEventMap {
  [BoxyEventType.BodyPartChanged]: {
    instanceId: string;  
    partType: PartType;
    partName: string;
  };
  [BoxyEventType.EmotionStateChanged]: {
    instanceId: string;  
    emotionPoint: Vector2;
    animation: BoxyAnimation | undefined;
  };
}

export class BoxyEventSystem {
  private static _instance: BoxyEventSystem;
  private _listeners: Map<BoxyEventType, ((data: any) => void)[]> = new Map();

  private constructor() {}

  public static getInstance(): BoxyEventSystem {
    if (!BoxyEventSystem._instance) {
      BoxyEventSystem._instance = new BoxyEventSystem();
    }
    return BoxyEventSystem._instance;
  }

  public subscribe<T extends BoxyEventType>(
    type: T,
    callback: (data: BoxyEventMap[T]) => void
  ): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)?.push(callback as (data: any) => void);
  }

  public unsubscribe<T extends BoxyEventType>(
    type: T,
    callback: (data: BoxyEventMap[T]) => void
  ): void {
    const callbacks = this._listeners.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback as (data: any) => void);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  public emit<T extends BoxyEventType>(
    type: T,
    data: BoxyEventMap[T]
  ): void {
    const callbacks = this._listeners.get(type);
    callbacks?.forEach(callback => callback(data));
  }

  public removeAllListeners(): void {
    this._listeners.clear();
  }
}