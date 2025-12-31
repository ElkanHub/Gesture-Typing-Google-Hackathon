
import { analyzeTrajectory } from '../../lib/shared/geometry';
import { getVisualCandidates } from '../../lib/candidate-filter';
import { KEY_MAP, getKeyCoordinates } from './keymap';

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

    private timeoutId: any = null;

    // Cache the scaled map
    private scaledKeyMap: any = null;

    constructor() {
        this.buildScaledKeyMap();
    }

    private buildScaledKeyMap() {
        this.scaledKeyMap = {};
        for (const [key, _] of Object.entries(KEY_MAP)) {
            const coords = getKeyCoordinates(key);
            // candidate-filter expects {x, y, width, height}, though it mostly uses x,y.
            // We'll give it a standard size estimate (e.g. 40px)
            this.scaledKeyMap[key] = { ...coords, width: 40, height: 40 };
        }
    }

    public addPoint(key: string, x: number, y: number) {
        const now = Date.now();

        // Clear existing timeout - we are still typing
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // If it's been a long time since last key (but timeout didn't get to fire?), reset
        if (now - this.lastKeyTime > 800) {
            this.trajectory = [];
            this._isTyping = false;
        }

        this.trajectory.push({ x, y, time: now, key });
        this.lastKeyTime = now;

        if (this.trajectory.length > 3) {
            this._isTyping = true;
        }

        // Set new timeout to process after silence
        this.timeoutId = setTimeout(() => {
            if (this.trajectory.length > 0) {
                console.log("Gesture Timeout - Processing...");
                this.process();
                this.trajectory = [];
                this._isTyping = false;
            }
        }, 300); // 300ms pause = End of Gesture
    }

    private agentEnabled = true;

    public setAgentEnabled(enabled: boolean) {
        this.agentEnabled = enabled;
        console.log(`[Gesture] Agent Mode: ${enabled ? 'ENABLED' : 'DISABLED'} (Typing Mode)`);
    }

    public process() {
        if (this.trajectory.length < 3) return; // Ignore taps

        console.log("Analyzing Gesture Locally...", this.trajectory.length);
        const result = analyzeTrajectory(this.trajectory);
        console.log("Local Result:", result);

        // --- Logic Branch based on Mode ---

        if (this.agentEnabled) {
            // AGENT MODE (No Input Focus)
            // Only allow Agent Triggers

            // Right Arrow (Summarize)
            if (this.isLineRight(result.sequence)) {
                console.log("AGENT TRIGGER: SUMMARIZE (Webpage)");
                this.triggerAgent('SUMMARIZE');
                return;
            }

            // Left Arrow (Read)
            if (this.isLineLeft(result.sequence)) {
                console.log("AGENT TRIGGER: READ (Webpage)");
                this.triggerAgent('READ');
                return;
            }

            console.log("Agent Mode: No valid agent gesture detected.");
        } else {
            // TYPING MODE (Input Focus)
            // Only allow Gesture Typing

            // NEW: Perform Candidate Filtering locally
            // We must interpolate the path because 'keydown' events are sparse (discrete),
            // but the filter expects a continuous gesture path to hit all letters.
            const denseTrajectory = this.generateDensePath(this.trajectory);

            const candidates = getVisualCandidates(
                denseTrajectory,
                result.anchors,
                this.scaledKeyMap
            );
            console.log("Filtered Candidates:", candidates);

            console.log("Typing Mode: Triggering prediction...");
            this.triggerPrediction(this.trajectory, result, candidates);
        }
    }

    private generateDensePath(sparsePoints: Point[]): Point[] {
        if (sparsePoints.length < 2) return sparsePoints;

        const dense: Point[] = [];
        for (let i = 0; i < sparsePoints.length - 1; i++) {
            const p1 = sparsePoints[i];
            const p2 = sparsePoints[i + 1];

            dense.push(p1);

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Interpolate every ~10 pixels
            const steps = Math.floor(dist / 10);

            for (let s = 1; s <= steps; s++) {
                const t = s / (steps + 1);
                dense.push({
                    x: p1.x + dx * t,
                    y: p1.y + dy * t,
                    time: p1.time + (p2.time - p1.time) * t,
                    key: '' // Intermediate points don't represent a key press
                });
            }
        }
        dense.push(sparsePoints[sparsePoints.length - 1]);
        return dense;
    }

    private async triggerPrediction(trajectory: Point[], analysis: any, candidates: string[]) {
        try {
            console.log("Requesting prediction...");
            const response = await chrome.runtime.sendMessage({
                type: 'PREDICT_GESTURE',
                trajectory,
                analysis,
                candidates // Send the filtered list
            });

            console.log("Prediction Response:", response);

            if (response && response.word) {
                // If the word matches the raw typing exactly, do nothing? 
                // No, we might want to fix casing or just confirm. 
                // But usually gesture is sloppy, so it won't match.

                this.deleteLastChars(trajectory.length);
                this.insertText(response.word);
            }
        } catch (e) {
            console.error("Prediction Error", e);
        }
    }

    private deleteLastChars(count: number) {
        const active = document.activeElement as HTMLElement;
        if (!active) return;

        console.log(`Deleting ${count} chars...`);

        // Strategy 1: Input/Textarea (Reliable)
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
            const start = active.selectionStart || 0;
            const end = active.selectionEnd || 0;
            // We assume the cursor is at the end of the gesture
            const newStart = Math.max(0, start - count);

            try {
                if (typeof active.setRangeText === 'function') {
                    active.setRangeText('', newStart, end, 'end');
                } else {
                    throw new Error("setRangeText not supported");
                }
            } catch (err) {
                active.setSelectionRange(newStart, end);
                document.execCommand('delete');
            }
        }
        // Strategy 2: ContentEditable (Docs, Gmail)
        else if (active.isContentEditable) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                // Reset selection to collapse to end first?
                // selection.collapseToEnd(); // Usually already at end

                for (let i = 0; i < count; i++) {
                    selection.modify('extend', 'backward', 'character');
                }
                document.execCommand('delete');
            }
        }
    }

    private insertText(text: string) {
        const active = document.activeElement as HTMLElement;
        const content = text + ' ';

        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
            try {
                if (typeof active.setRangeText === 'function') {
                    const start = active.selectionStart || 0;
                    active.setRangeText(content, start, start, 'end');
                    // Dispatch input event to notify frameworks (React, etc.)
                    active.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    throw new Error("setRangeText not supported");
                }
            } catch (err) {
                document.execCommand('insertText', false, content);
            }
        } else {
            document.execCommand('insertText', false, content);
        }
    }

    private isLineRight(seq: string): boolean {
        // Fuzzy match: Needs to match the order roughly
        // e.g. "sdfgh" matched in "asdfghjkl"
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        for (const row of rows) {
            if (this.fuzzyMatch(seq, row)) return true;
        }
        return false;
    }

    private isLineLeft(seq: string): boolean {
        // Reverse match
        const rows = ['poiuytrewq', 'lkjhgfdsa', 'mnbvcxz'];
        for (const row of rows) {
            if (this.fuzzyMatch(seq, row)) return true;
        }
        return false;
    }

    // Returns true if 'seq' characters appear in 'row' in correct relative order
    // And 'seq' has at least 3 chars
    private fuzzyMatch(seq: string, row: string): boolean {
        if (seq.length < 3) return false;

        // Remove duplicates from seq (e.g. "ssddff" -> "sdf")
        const cleanSeq = seq.split('').filter((item, pos, self) => {
            return self.indexOf(item) == pos;
        }).join('');

        let lastIndex = -1;
        let matchCount = 0;

        for (const char of cleanSeq) {
            const index = row.indexOf(char);
            if (index > -1 && index > lastIndex) {
                lastIndex = index;
                matchCount++;
            }
        }

        // Match if significant overlap
        return matchCount >= 3;
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
