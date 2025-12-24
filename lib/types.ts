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
