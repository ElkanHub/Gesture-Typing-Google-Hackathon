"use client";

// Simple local storage wrapper for gesture patterns
// Mapping: KeySequence -> Word

const STORAGE_KEY = 'gesture_patterns';

export const PatternStore = {
    getMatch: (sequence: string): string | null => {
        if (typeof window === 'undefined') return null;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;

            const patterns = JSON.parse(stored);
            // Determine match. For now, exact string match of the simplified sequence.
            return patterns[sequence] || null;
        } catch (e) {
            console.error("Pattern load failed", e);
            return null;
        }
    },

    learnPattern: (sequence: string, word: string) => {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const patterns = stored ? JSON.parse(stored) : {};

            // Learn: Overwrite or update frequency?
            // User request: "if user chooses another word... that word will be saved"
            // Implies deterministic override.

            if (patterns[sequence] !== word) {
                console.log(`[PatternStore] Learned: ${sequence} -> ${word}`);
                patterns[sequence] = word;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
            }
        } catch (e) {
            console.error("Pattern save failed", e);
        }
    }
};
