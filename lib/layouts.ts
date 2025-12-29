
export type LayoutType = 'QWERTY' | 'AZERTY' | 'QWERTZ' | 'DVORAK' | 'COLEMAK';

export interface LayoutDefinition {
    name: LayoutType;
    // Map from QWERTY visual position (char) to Actual input (char)
    // e.g. for AZERTY: 'q': 'a', 'w': 'z'
    mapping: Record<string, string>;
    // Signatures to detect this layout
    // key: visual_target (what we asked user to press), value: actual_input (what we received)
    signatures: Record<string, string>;
}

export const KEYBOARD_LAYOUTS: Record<LayoutType, LayoutDefinition> = {
    'QWERTY': {
        name: 'QWERTY',
        mapping: {}, // Identity
        signatures: { 'q': 'q', 'w': 'w', 'a': 'a', 'z': 'z' }
    },
    'AZERTY': {
        name: 'AZERTY',
        mapping: {
            'q': 'a', 'w': 'z', 'a': 'q', 'z': 'w',
            'm': ',', ';': 'm', ',': ';',
            // ... add more if needed for full coverage, but main ones suffice
        },
        signatures: { 'q': 'a', 'w': 'z' }
    },
    'QWERTZ': {
        name: 'QWERTZ',
        mapping: {
            'y': 'z', 'z': 'y'
        },
        signatures: { 'y': 'z', 'z': 'y' }
    },
    'DVORAK': {
        name: 'DVORAK',
        mapping: {
            'q': "'", 'w': ',', 'e': '.', 'r': 'p', 't': 'y', 'y': 'f', 'u': 'g', 'i': 'c', 'o': 'r', 'p': 'l',
            'a': 'a', 's': 'o', 'd': 'e', 'f': 'u', 'g': 'i', 'h': 'd', 'j': 'h', 'k': 't', 'l': 'n', ';': 's',
            'z': ';', 'x': 'q', 'c': 'j', 'v': 'k', 'b': 'x', 'n': 'b', 'm': 'm'
        },
        signatures: { 's': 'o', 'd': 'e', 'f': 'u' } // Distinctive middle row
    },
    'COLEMAK': {
        name: 'COLEMAK',
        mapping: {
            'e': 'f', 'r': 'p', 't': 'g', 'y': 'j', 'u': 'l', 'i': 'u', 'o': 'y', 'p': ';',
            's': 'r', 'd': 's', 'f': 't', 'g': 'd', 'j': 'n', 'k': 'e', 'l': 'i', ';': 'o',
            'n': 'k'
        },
        signatures: { 'e': 'f', 'r': 'p', 's': 'r' }
    }
};

export function detectLayout(target: string, input: string): LayoutType | null {
    // Check match against signatures
    for (const type of Object.keys(KEYBOARD_LAYOUTS) as LayoutType[]) {
        const def = KEYBOARD_LAYOUTS[type];
        if (def.signatures[target] === input) {
            return type;
        }
    }
    return null;
}
