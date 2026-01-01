
import { analyzeTrajectory } from './lib/geometry';
import { getVisualCandidates } from './lib/candidate-filter';
import { KEY_MAP, getKeyCoordinates } from './keymap';
import { PatternStore, initPatternStore } from './lib/pattern-store';
import { COMMON_WORDS } from './lib/dictionary';

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
    private onStatusChange?: (state: any, msg?: string) => void;

    constructor(onStatusChange?: (state: any, msg?: string) => void) {
        this.onStatusChange = onStatusChange;
        this.buildScaledKeyMap();
        initPatternStore(); // Start loading cache
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
        try {
            // DYNAMIC MODE CHECK (Fix for stuck Agent Mode)
            const active = document.activeElement as HTMLElement;
            const isInput = active && (
                active instanceof HTMLInputElement ||
                active instanceof HTMLTextAreaElement ||
                active.isContentEditable
            );

            // Force mode based on actual focus
            if (isInput) {
                this.agentEnabled = false;
            } else {
                this.agentEnabled = true;
            }

            console.log(`[Process] Real-time Mode: ${this.agentEnabled ? 'AGENT' : 'TYPING'} | Active Element: ${active?.tagName} | Trajectory: ${this.trajectory.length}`);

            if (this.trajectory.length < 3) return; // Ignore taps

            console.log("Analyzing Gesture Locally...", this.trajectory.length);

            // Step 1: Geometry Analysis
            let result;
            try {
                result = analyzeTrajectory(this.trajectory);
                console.log("Local Result (Anchors):", result.anchors);
                console.log("Local Result (Sequence):", result.sequence);
            } catch (err: any) {
                console.error("Analysis Failed:", err);
                if (this.onStatusChange) this.onStatusChange('error', `Analysis: ${err.message}`);
                return;
            }

            if (!result.anchors || result.anchors.length === 0) {
                console.warn("WARNING: No anchors detected. Trajectory might be too short or linear.");
            }

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

                // 1. CACHE CHECK (Optimization)
                const cachedWord = PatternStore.getMatch(result.sequence);
                if (cachedWord) {
                    console.log(`[Cache Hit] ${result.sequence} -> ${cachedWord}`);
                    if (this.onStatusChange) this.onStatusChange('success', `Cached: ${cachedWord}`);
                    this.deleteLastChars(this.trajectory.length);
                    this.insertText(cachedWord);
                    return; // SKIP API
                }

                // 2. ANCHOR MATCH (Alignment with Main App)
                // If the user's key stops literally spell a common word, accept it.
                if (result.anchors && result.anchors.length >= 3) {
                    const anchorWord = result.anchors.join('');
                    if (COMMON_WORDS.includes(anchorWord)) {
                        console.log(`[Anchor Match] ${anchorWord}`);
                        if (this.onStatusChange) this.onStatusChange('success', `Direct: ${anchorWord}`);

                        // Learn this specific path for this word
                        PatternStore.learnPattern(result.sequence, anchorWord);

                        this.deleteLastChars(this.trajectory.length);
                        this.insertText(anchorWord);
                        return; // SKIP API
                    }
                }

                // NEW: Perform Candidate Filtering locally (Anchor-Based)
                // We depend purely on the Sequence and Anchors string data.

                if (this.onStatusChange) this.onStatusChange('processing', 'Analyzing...');

                // Step 3: Candidate Filter
                const candidates = getVisualCandidates(
                    this.trajectory,
                    result.anchors,
                    this.scaledKeyMap
                );
                console.log("Filtered Candidates (Visual):", candidates);

                if (candidates.length === 0) {
                    console.warn("Local Filter found 0 candidates.");
                    if (this.onStatusChange) {
                        this.onStatusChange('error', 'No candidates found (Fit)');
                        // Optimization: Don't call API if we are sure?
                        // But let's let API try anyway for fuzzier matching
                    }
                } else {
                    if (this.onStatusChange) this.onStatusChange('processing', `Found ${candidates.length} candidates...`);
                }

                const context = this.getContext(); // Capture context
                // Send SEQUENCE instead of TRAJECTORY
                this.triggerPrediction(result.sequence, result, candidates, context, this.scaledKeyMap);
            }
        } catch (e: any) {
            console.error("Process Logic Error:", e);
            if (this.onStatusChange) this.onStatusChange('error', `Logic: ${e.message}`);
        }
    }

    // method removed


    private async triggerPrediction(sequence: string, analysis: any, candidates: string[], context: string, keyMap: any) {
        try {
            console.log("Requesting prediction (Seq)...");
            if (this.onStatusChange) this.onStatusChange('processing', 'API Request Sent...');

            const response = await chrome.runtime.sendMessage({
                type: 'PREDICT_GESTURE',
                sequence, // Payload is now String
                analysis,
                candidates,
                context,
                keyMap
            });

            console.log("Prediction Response:", response);

            if (response && response.success) {
                if (response.word) {
                    if (this.onStatusChange) this.onStatusChange('success', `API: ${response.word}`);

                    // SAVE PATTERN (Optimization)
                    if (sequence) {
                        PatternStore.learnPattern(sequence, response.word);
                    }

                    if (this.onStatusChange) this.onStatusChange('processing', `Deleting ${sequence.length} chars...`);
                    this.deleteLastChars(sequence.length); // Delete amount based on raw sequence length

                    if (this.onStatusChange) this.onStatusChange('processing', `Inserting ${response.word}...`);
                    this.insertText(response.word);

                    if (this.onStatusChange) this.onStatusChange('success', `Done: ${response.word}`);
                } else {
                    console.warn("API returned success but no word.");
                    if (this.onStatusChange) this.onStatusChange('error', 'API: Success but NO WORD');
                }
            } else {
                const err = response?.error || "Unknown API Error";
                console.error("API Failure:", err);
                if (this.onStatusChange) this.onStatusChange('error', `API Fail: ${err}`);
            }
        } catch (e: any) {
            console.error("Prediction Error", e);
            if (this.onStatusChange) this.onStatusChange('error', `Comm Error: ${e.message}`);
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

    private getContext(): string {
        const active = document.activeElement as HTMLElement;
        if (!active) return "";

        let text = "";
        try {
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
                const end = active.selectionStart || 0;
                // Grab up to 500 chars before cursor
                const start = Math.max(0, end - 500);
                text = active.value.substring(start, end);
            } else if (active.isContentEditable) {
                // Approximate context for content editable
                text = active.innerText || active.textContent || "";
                if (text.length > 500) text = text.slice(-500);
            }
        } catch (e) {
            console.warn("Failed to read context", e);
        }
        return text;
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
