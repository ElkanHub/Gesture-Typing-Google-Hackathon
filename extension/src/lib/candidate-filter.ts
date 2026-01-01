import { COMMON_WORDS } from "./dictionary";

export function getSequenceCandidates(
    sequence: string,
    anchors: string[]
): string[] {
    if (!sequence || anchors.length < 2) return [];

    const startChar = anchors[0];
    const endChar = anchors[anchors.length - 1];

    // Middle anchors are essential structure points (turns/pauses)
    const middleAnchors = anchors.slice(1, -1);

    return COMMON_WORDS.filter(word => {
        // 1. Hard Constraint: Start/End
        if (!word.startsWith(startChar)) return false;
        if (!word.endsWith(endChar)) return false;

        // 2. Hard Constraint: All anchors must exist in order
        let lastIndex = 0;
        for (const anchor of middleAnchors) {
            const idx = word.indexOf(anchor, lastIndex);
            if (idx === -1) return false; // Anchor not found after previous anchor
            lastIndex = idx + 1; // Advance
        }

        // 3. Soft Constraint: The raw sequence must effectively "spell" the word
        // (The word must be a subsequence of the raw input sequence)
        // logic: can we form 'word' by dropping chars from 'sequence'?
        if (!isSubsequence(word, sequence)) return false;

        return true;
    }).slice(0, 50); // Limit results
}

// Check if 'word' chars appear in 'sequence' in order
function isSubsequence(word: string, sequence: string): boolean {
    if (word.length > sequence.length) return false;

    let wIdx = 0;
    let sIdx = 0;

    while (wIdx < word.length && sIdx < sequence.length) {
        if (word[wIdx] === sequence[sIdx]) {
            wIdx++;
        }
        sIdx++;
    }

    return wIdx === word.length;
}
