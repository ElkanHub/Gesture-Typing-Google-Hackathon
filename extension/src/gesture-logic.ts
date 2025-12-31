
import { analyzeTrajectory } from '@shared/geometry';

export interface Point {
    x: number;
    y: number;
    time: number;
    key: string;
}

export class GestureProcessor {
    private trajectory: Point[] = [];
    private isTyping = false;
    private lastKeyTime = 0;

    constructor() { }

    public addPoint(key: string, x: number, y: number) {
        const now = Date.now();

        // Basic timeout to reset trajectory if user stops
        if (now - this.lastKeyTime > 500 && this.trajectory.length > 0) {
            this.process();
            this.trajectory = [];
        }

        this.trajectory.push({ x, y, time: now, key });
        this.lastKeyTime = now;

        // If we have enough points, start analyzing locally
        if (this.trajectory.length > 3) {
            this.isTyping = true;
        }
    }

    public process() {
        if (this.trajectory.length < 3) return; // Ignore taps

        console.log("Analyzing Gesture Locally...", this.trajectory.length);
        const result = analyzeTrajectory(this.trajectory);
        console.log("Local Result:", result);

        // TODO: If local confidence high, insert text.
        // Else, call API.
    }
}
