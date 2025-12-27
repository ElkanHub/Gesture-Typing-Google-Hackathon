"use client";

// Simple local storage wrapper for gesture patterns
// Mapping: KeySequence -> Word

const STORAGE_KEY = 'gesture_patterns';

// In-memory cache to avoid JSON.parse on every lookup
let memoizedPatterns: Record<string, string> | null = null;

const loadPatterns = (): Record<string, string> => {
    if (memoizedPatterns) return memoizedPatterns;
    if (typeof window === 'undefined') return {};

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        memoizedPatterns = stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Pattern load failed", e);
        memoizedPatterns = {};
    }
    return memoizedPatterns!;
};

const savePatterns = (patterns: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
        memoizedPatterns = patterns; // Update cache
    } catch (e) {
        console.error("Pattern save failed", e);
    }
};

export const PatternStore = {
    getMatch: (sequence: string): string | null => {
        const patterns = loadPatterns();
        return patterns[sequence] || null;
    },

    learnPattern: (sequence: string, word: string) => {
        const patterns = loadPatterns();

        // Only save if it's a new or different mapping (Efficiency)
        if (patterns[sequence] !== word) {
            console.log(`[PatternStore] Learned: ${sequence} -> ${word}`);
            patterns[sequence] = word;
            savePatterns(patterns);
        }
    },

    // For Debugging / Training Page
    getAll: (): Record<string, string> => {
        return loadPatterns();
    },

    clear: () => {
        savePatterns({});
    }
};
