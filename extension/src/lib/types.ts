export interface Point {
    x: number;
    y: number;
    time: number;
    key?: string; // Optional because intermediate points in dense path might not have keys
    originalKey?: string;
}

export type GestureMode = 'VALIDATION' | 'TYPING' | 'DRAWING' | 'TRAINING';

export interface KeyMap {
    [key: string]: { x: number; y: number; width: number; height: number };
}

export type ShapeType = 'circle' | 'square' | 'triangle' | 'line';

export interface Shape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    color?: string;
}
