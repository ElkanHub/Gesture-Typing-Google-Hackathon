
import { analyzeTrajectory } from '../../lib/shared/geometry';

export interface Point {
    x: number;
    y: number;
    time: number;
    key: string;
}

export class GestureProcessor {
    private trajectory: Point[] = [];
    private _isTyping = false;

    public get isTyping() { return this._isTyping; }
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
            this._isTyping = true;
        }
    }

    public process() {
        if (this.trajectory.length < 3) return; // Ignore taps

        console.log("Analyzing Gesture Locally...", this.trajectory.length);
        const result = analyzeTrajectory(this.trajectory);
        console.log("Local Result:", result);

        // --- Agentic Triggers ---
        // Right Arrow (Summarize): Line from Left to Right (e.g. 'asdfghjkl')
        if (this.isLineRight(result.sequence)) {
            console.log("AGENT TRIGGER: SUMMARIZE (Webpage)");
            this.triggerAgent('SUMMARIZE');
            return;
        }

        // Left Arrow (Read): Line from Right to Left (e.g. 'lkjhgfdsa')
        if (this.isLineLeft(result.sequence)) {
            console.log("AGENT TRIGGER: READ (Webpage)");
            this.triggerAgent('READ');
            return;
        }

        // --- Gesture Typing Logic ---
        this.triggerPrediction(this.trajectory, result);
    }

    private async triggerPrediction(trajectory: Point[], analysis: any) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'PREDICT_GESTURE',
                trajectory,
                analysis
            });

            if (response && response.word) {
                this.insertText(response.word);
            }
        } catch (e) {
            console.error("Prediction Error", e);
        }
    }

    private insertText(text: string) {
        const active = document.activeElement as HTMLElement;
        if (active) {
            document.execCommand('insertText', false, text + ' ');
        }
    }

    private isLineRight(seq: string): boolean {
        // Basic match for row sequences
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        for (const row of rows) {
            if (row.includes(seq) && seq.length > 4) return true;
        }
        return false;
    }

    private isLineLeft(seq: string): boolean {
        // Reverse match
        const rows = ['poiuytrewq', 'lkjhgfdsa', 'mnbvcxz'];
        for (const row of rows) {
            if (row.includes(seq) && seq.length > 4) return true;
        }
        return false;
    }

    private async triggerAgent(action: 'SUMMARIZE' | 'READ') {
        const textToProcess = document.body.innerText.substring(0, 10000); // Grab first 10k chars for speed
        try {
            chrome.runtime.sendMessage({
                type: 'AGENT_ACTION',
                action,
                text: textToProcess
            });
        } catch (e) {
            console.error("Failed to send to background", e);
        }
    }
}
