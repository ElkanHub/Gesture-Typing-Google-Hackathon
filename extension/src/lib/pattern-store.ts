export const STORAGE_KEY = 'gesture_patterns';

// In-memory cache
let memoizedPatterns: Record<string, string> = {};
let isLoaded = false;

// Initialize: Load from Chrome Storage
export async function initPatternStore() {
    if (isLoaded) return;
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        if (result[STORAGE_KEY]) {
            memoizedPatterns = result[STORAGE_KEY];
            console.log(`[PatternStore] Loaded ${Object.keys(memoizedPatterns).length} patterns.`);
        }
        isLoaded = true;
    } catch (e) {
        console.error("[PatternStore] Load failed", e);
    }
}

export const PatternStore = {
    // Synchronous check (requires init to wait, but we can just return null if not ready)
    getMatch: (sequence: string): string | null => {
        if (!isLoaded) return null;
        return memoizedPatterns[sequence] || null;
    },

    learnPattern: (sequence: string, word: string) => {
        // Only save if new
        if (memoizedPatterns[sequence] !== word) {
            console.log(`[PatternStore] Learned: ${sequence} -> ${word}`);
            memoizedPatterns[sequence] = word;

            // Persist async
            chrome.storage.local.set({ [STORAGE_KEY]: memoizedPatterns }).catch(err => {
                console.error("[PatternStore] Save failed", err);
            });
        }
    }
};
