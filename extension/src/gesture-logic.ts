
import { analyzeTrajectory } from './lib/geometry';
import { getVisualCandidates } from './lib/candidate-filter';
import { KEY_MAP, getKeyCoordinates } from './keymap';
import { PatternStore, initPatternStore } from './lib/pattern-store';
import { COMMON_WORDS } from './lib/dictionary';
import type { Point } from './lib/types';

export class GestureProcessor {
    private trajectory: Point[] = [];
    private lastKeyTime = 0;
    private timeoutId: any = null;
    private scaledKeyMap: any = null;
    private onStatusChange?: (state: any, msg?: string) => void;

    // Default to true, but will be checked dynamically
    private agentEnabled = true;

    constructor(onStatusChange?: (state: any, msg?: string) => void) {
        this.onStatusChange = onStatusChange;
        this.buildScaledKeyMap();
        initPatternStore();
    }

    private buildScaledKeyMap() {
        this.scaledKeyMap = {};
        for (const [key, _] of Object.entries(KEY_MAP)) {
            const coords = getKeyCoordinates(key);
            this.scaledKeyMap[key] = { ...coords, width: 40, height: 40 };
        }
    }

    public addPoint(key: string, x: number, y: number) {
        const now = Date.now();

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (now - this.lastKeyTime > 800) {
            this.trajectory = [];
        }

        this.trajectory.push({ x, y, time: now, key });
        this.lastKeyTime = now;

        if (this.trajectory.length > 2) {
            // this._isTyping = true;
        }

        this.timeoutId = setTimeout(() => {
            if (this.trajectory.length > 0) {
                this.process();
                this.trajectory = [];
            }
        }, 350);
    }

    public setAgentEnabled(enabled: boolean) {
        this.agentEnabled = enabled;
        // console.log(`[Gesture] Agent Mode Manual Set: ${enabled}`);
    }

    public process() {
        // --- 1. CRITICAL: Dynamic Mode Check ---
        const active = document.activeElement as HTMLElement;
        const isInput = active && (
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            active.isContentEditable
        );

        // Force mode based on reality
        this.agentEnabled = !isInput;
        const modeName = this.agentEnabled ? 'AGENT' : 'TYPING';
        console.log(`[Gesture] Processing. Mode: ${modeName} | Trajectory: ${this.trajectory.length}`);

        if (this.trajectory.length < 3) return; // Ignore taps

        // --- 2. Geometry Analysis ---
        let result;
        try {
            // Map our local Point to the geometry.ts Point if needed, but they should match structure now
            // The lib/geometry.ts expects {x,y,time,key}
            result = analyzeTrajectory(this.trajectory);
            console.log("Local Analysis:", result);
        } catch (e) {
            console.error("Analysis Failed", e);
            if (this.onStatusChange) this.onStatusChange('error', 'Analysis Failed');
            return;
        }

        if (!result.anchors || result.anchors.length === 0) {
            console.warn("No anchors found.");
            return;
        }

        // --- 3. Branch Logic ---
        if (this.agentEnabled) {
            this.handleAgentGestures(result.sequence);
        } else {
            this.handleTypingGestures(result);
        }
    }

    private handleAgentGestures(sequence: string) {
        // Right Arrow (Summarize)
        if (this.isLineRight(sequence)) {
            console.log("AGENT: SUMMARIZE");
            this.triggerAgent('SUMMARIZE');
            return;
        }
        // Left Arrow (Read)
        if (this.isLineLeft(sequence)) {
            console.log("AGENT: READ");
            this.triggerAgent('READ');
            return;
        }
    }

    private handleTypingGestures(result: { sequence: string, anchors: string[] }) {
        // Capture length BEFORE it is cleared by the timeout!
        const deleteCount = this.trajectory.length;

        if (this.onStatusChange) this.onStatusChange('processing', 'Analyzing...');

        // A. Cache Check
        const cachedWord = PatternStore.getMatch(result.sequence);
        if (cachedWord) {
            console.log(`[Cache Hit] ${cachedWord}`);
            if (this.onStatusChange) this.onStatusChange('success', `Cached: ${cachedWord}`);
            this.replaceText(cachedWord, deleteCount);
            return;
        }

        // B. Perfect Anchor Match (Direct Dictionary)
        if (result.anchors.length >= 3) {
            const anchorWord = result.anchors.join('');
            if (COMMON_WORDS.includes(anchorWord)) {
                console.log(`[Anchor Match] ${anchorWord}`);
                PatternStore.learnPattern(result.sequence, anchorWord);
                if (this.onStatusChange) this.onStatusChange('success', `Direct: ${anchorWord}`);
                this.replaceText(anchorWord, deleteCount);
                return;
            }
        }

        // C. Geometric Filter (Visual Candidates)
        const candidates = getVisualCandidates(
            this.trajectory,
            result.anchors,
            this.scaledKeyMap
        );
        console.log(`[Filter] Candidates: ${candidates.length}`, candidates);

        if (candidates.length > 0) {
            if (this.onStatusChange) this.onStatusChange('processing', `Found ${candidates.length} candidates...`);
        } else {
            console.warn("Zero candidates found locally.");
            if (this.onStatusChange) this.onStatusChange('processing', 'Zero candidates... asking API anyway');
        }

        // D. API Prediction
        const context = this.getContext();
        this.triggerPrediction(result.sequence, result, candidates, context, deleteCount);
    }

    private async triggerPrediction(sequence: string, analysis: any, candidates: string[], context: string, deleteCount: number) {
        try {
            if (this.onStatusChange) this.onStatusChange('processing', 'API Request...');
            console.log("Sending to API...");

            const response = await chrome.runtime.sendMessage({
                type: 'PREDICT_GESTURE',
                sequence,
                analysis,
                candidates,
                context,
                keyMap: this.scaledKeyMap
            });

            console.log("API Response:", response);

            if (response && response.success && response.word) {
                if (this.onStatusChange) this.onStatusChange('success', `API: ${response.word}`);
                // Learn
                PatternStore.learnPattern(sequence, response.word);
                this.replaceText(response.word, deleteCount);
            } else {
                console.warn("API Failure/No Word", response);
                if (this.onStatusChange) this.onStatusChange('error', 'No prediction');
            }
        } catch (e: any) {
            console.error("API call error", e);
            if (this.onStatusChange) this.onStatusChange('error', 'Network Error');
        }
    }

    private replaceText(word: string, deleteCount: number) {
        // DELETE raw sequence length
        // We approximate the number of characters to delete by the 'time' or just 'sequence length'
        // Actually, for raw stream visualization, the user sees characters appearing. 
        // We should delete however many characters were typed during this gesture.
        // A simple heuristic is trajectory length is too many.
        // Let's rely on the fact that the 'addPoint' logic doesn't insert text directly? 
        // WAIT. Content.ts inserts nothing. The BROWSER inserts keys because they are keydown/keypress.
        // We need to delete the number of characters that were actually typed.
        // Since we don't track exact keypress successes, we estimate based on sequence length or trajectory length?
        // No, the sequence string is just unique keys.
        // Realistically, the user typed `this.trajectory.length` characters? 
        // Usually yes, if every point corresponds to a keydown.

        console.log(`Deleting ${deleteCount} chars and inserting "${word}"`);

        this.deleteLastChars(deleteCount);
        this.insertText(word);
    }

    private deleteLastChars(count: number) {
        const active = document.activeElement as HTMLElement;
        if (!active) return;

        // Visual feedback update
        if (this.onStatusChange) this.onStatusChange('processing', 'Replacing...');

        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
            const start = active.selectionStart || 0;
            const end = active.selectionEnd || 0;
            const newStart = Math.max(0, start - count);

            try {
                if (typeof active.setRangeText === 'function') {
                    active.setRangeText('', newStart, end, 'end');
                } else {
                    document.execCommand('delete');
                }
            } catch (err) {
                // Fallback
                active.setSelectionRange(newStart, end);
                document.execCommand('delete');
            }
        } else if (active.isContentEditable) {
            // Content Editable fallback
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
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
                    active.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    document.execCommand('insertText', false, content);
                }
            } catch (err) {
                document.execCommand('insertText', false, content);
            }
        } else {
            document.execCommand('insertText', false, content);
        }
    }

    private getContext(): string {
        try {
            const active = document.activeElement as HTMLElement;
            if (!active) return "";
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
                return active.value.slice(Math.max(0, active.selectionStart! - 100), active.selectionStart!);
            }
            return active.innerText?.slice(-100) || "";
        } catch (e) { return ""; }
    }

    // --- Helpers ---
    private isLineRight(seq: string): boolean {
        const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
        for (const row of rows) if (this.fuzzyMatch(seq, row)) return true;
        return false;
    }
    private isLineLeft(seq: string): boolean {
        const rows = ['poiuytrewq', 'lkjhgfdsa', 'mnbvcxz'];
        for (const row of rows) if (this.fuzzyMatch(seq, row)) return true;
        return false;
    }
    private fuzzyMatch(seq: string, row: string): boolean {
        if (seq.length < 3) return false;
        const cleanSeq = seq.split('').filter((item, pos, self) => self.indexOf(item) == pos).join('');
        let lastIndex = -1;
        let matchCount = 0;
        for (const char of cleanSeq) {
            const index = row.indexOf(char);
            if (index > -1 && index > lastIndex) {
                lastIndex = index;
                matchCount++;
            }
        }
        return matchCount >= 3;
    }
    private async triggerAgent(action: string) {
        // Implementation for agent trigger
        try {
            chrome.runtime.sendMessage({
                type: 'AGENT_ACTION',
                action,
                text: document.body.innerText.substring(0, 5000)
            });
        } catch (e) {
            console.error("Agent Trigger Failed", e);
        }
    }
}
