import { COMMON_WORDS } from "./dictionary";
import type { Point, KeyMap } from "./types";

const MAX_DISTANCE_THRESHOLD = 80; // Pixels (Adjust based on key size, usually ~50-60px per key)

function getDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function isWordPhysicallyPossible(word: string, trajectory: Point[], keyMap: KeyMap): boolean {
    // Optimization: Skip very short words (handled by start/end check)
    if (word.length <= 2) return true;

    for (let i = 1; i < word.length - 1; i++) {
        const char = word[i].toLowerCase();

        // Skip double letters if the previous one was valid (lenient on double taps/pauses)
        if (i > 0 && char === word[i - 1].toLowerCase()) continue;

        const keyPos = keyMap[char];
        if (!keyPos) continue; // Skip unknown keys

        // Check if any point in the trajectory is close enough to this key
        let isClose = false;
        // Optimization: We could search only the segment of trajectory relevant to current index
        // But for simplicity, we search the whole path (user might wobble).

        for (const p of trajectory) {
            const dist = getDistance(p.x, p.y, keyPos.x, keyPos.y);
            if (dist < MAX_DISTANCE_THRESHOLD) {
                isClose = true;
                break;
            }
        }

        if (!isClose) return false;
    }
    return true;
}

export function getVisualCandidates(trajectory: Point[], anchors: string[], keyMap: KeyMap): string[] {
    if (trajectory.length < 2) return [];

    const startKey = trajectory[0].key;
    const endKey = trajectory[trajectory.length - 1].key;

    if (!startKey || !endKey) return [];

    // Filter Logic
    const visualCandidates = COMMON_WORDS.filter(word => {
        const w = word.toLowerCase();

        // 1. Basic Start/End Check (Strict)
        if (!w.startsWith(startKey) || !w.endsWith(endKey || '')) {
            return false;
        }

        // 2. Length Heuristic (Lenient)
        // Word length shouldn't be drastically different from anchor count + fuzz
        if (w.length < anchors.length) return false;

        // 3. Anchor Subsequence Check
        // The word must contain the anchors in order
        let lastIndex = -1;
        for (const anchor of anchors) {
            const idx = w.indexOf(anchor, lastIndex + 1);
            if (idx === -1) return false;
            lastIndex = idx;
        }

        // 4. Geometric "Hit Test" (NEW)
        // Ensure every letter in the word was actually "touched" or approached
        if (!isWordPhysicallyPossible(w, trajectory, keyMap)) {
            return false;
        }

        return true;
    });

    // Limit to top 20 candidates
    return visualCandidates.slice(0, 20);
}
