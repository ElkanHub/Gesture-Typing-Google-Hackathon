export type Point = {
    x: number;
    y: number;
    time: number;
    key?: string;
    originalKey?: string;
};

export type GestureMode = 'VALIDATION' | 'TYPING' | 'DRAWING';

export interface KeyMap {
    [key: string]: { x: number; y: number; width: number; height: number };
}

export type ShapeType = 'circle' | 'square' | 'triangle' | 'line';

export interface Shape {
    id: string;
    type: ShapeType;
    x: number; // Normalized center x (0-1)
    y: number; // Normalized center y (0-1)
    width: number; // Normalized width
    height: number; // Normalized height
    rotation?: number;
    color?: string;
}
