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
    const endKey = trajectory[trajectory.length - 1].key!;

    if (!startKey || !endKey) return [];

    // Build a Set of all keys touched in the trajectory for the "Negative Constraint"
    // "candidates should be words that... do not have any other letter that is not part of the raw stream"
    const trajectoryKeySet = new Set(trajectory.map(p => p.key));

    // Filter Logic with Backfill Strategy

    // Pass 1: Strict Candidates (Negative Constraint Enforced)
    const strictCandidates = COMMON_WORDS.filter(word => {
        const w = word.toLowerCase();
        if (!w.startsWith(startKey) || !w.endsWith(endKey)) return false;
        if (w.length < anchors.length) return false;

        // Strict Negative Constraint
        for (const char of w) {
            if (!trajectoryKeySet.has(char)) return false;
        }

        // Anchor Check
        let lastIndex = -1;
        for (const anchor of anchors) {
            const idx = w.indexOf(anchor, lastIndex + 1);
            if (idx === -1) return false;
            lastIndex = idx;
        }

        // Geometric Hit Test
        if (!isWordPhysicallyPossible(w, trajectory, keyMap)) return false;

        return true;
    });

    // Pass 2: Lenient Candidates (Backfill if necessary)
    // Only run if strict candidates < 6
    let candidates = [...strictCandidates];

    if (candidates.length < 6) {
        const lenientCandidates = COMMON_WORDS.filter(word => {
            const w = word.toLowerCase();
            // Skip if already in strict list
            if (candidates.includes(word)) return false;

            // Still need Start/End
            if (!w.startsWith(startKey) || !w.endsWith(endKey)) return false;

            // Relaxed Length: Allow words slightly shorter than strict anchor count
            // (e.g. if we found 5 anchors, maybe the word is only 4 letters and we had a phantom anchor)
            if (w.length < anchors.length - 2) return false;

            // *SKIP* Strict Negative Constraint

            // *SKIP* Anchor Subsequence Check in lenient mode
            // (We trust Start/End + Geometry to find plausible alternatives)

            // Geometric Hit Test (Crucial)
            if (!isWordPhysicallyPossible(w, trajectory, keyMap)) return false;

            return true;
        });

        // Fill up to 6
        const needed = 6 - candidates.length;
        candidates = [...candidates, ...lenientCandidates.slice(0, needed)];
    }

    return candidates.slice(0, 6);
}
