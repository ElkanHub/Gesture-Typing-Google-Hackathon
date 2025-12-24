import { COMMON_WORDS } from './dictionary';
import { Point } from '@/components/gesture-context';

export function getVisualCandidates(trajectory: Point[], anchors: string[]): string[] {
    if (!trajectory.length || !anchors.length) return [];

    // 1. Identification of Start/End
    const startKey = trajectory[0].key || '';
    const endKey = trajectory[trajectory.length - 1].key || '';

    if (!startKey || !endKey) return [];

    // 2. Filter Logic
    const candidates = COMMON_WORDS.filter(word => {
        // Strict Start/End Constraint
        // (For production, we might allow neighbors, but strict is good for prototype)
        if (word[0].toLowerCase() !== startKey) return false;
        if (word[word.length - 1].toLowerCase() !== endKey) return false;

        // Length Heuristic: Gesture length shouldn't be drastically different from word length?
        // Actually, swipe paths can be long for short words (if keys are far).
        // Time duration helps, but simple length diff is safer.
        // Let's assume word length roughly >= anchor count.
        if (word.length < anchors.length - 1) return false;

        // Anchor check: The word must contain the "Middle Anchors" in relative order
        // This is a "subsequence" check.
        // Start and End are already checked. Middle anchors:
        const middleAnchors = anchors.slice(1, -1);

        if (middleAnchors.length > 0) {
            let lastIndex = 0; // Index in word
            for (const anchor of middleAnchors) {
                const foundIndex = word.indexOf(anchor, lastIndex);
                if (foundIndex === -1) {
                    // Anchor not found in remaining part of word
                    return false;
                }
                lastIndex = foundIndex + 1; // Advance
            }
        }

        return true;
    });

    // Sort? Maybe by commonality (index in array) or length vs trajectory length match?
    // Since our dictionary is already sorted by frequency (top 500), preserving order is good.

    // Limit to top 20
    return candidates.slice(0, 20);
}
