
// Approximate relative positions for a standard QWERTY keyboard
// Row 1: q w e r t y u i o p
// Row 2: a s d f g h j k l
// Row 3: z x c v b n m

export const KEY_MAP: Record<string, { x: number, y: number }> = {
    // Row 1
    'q': { x: 0, y: 0 }, 'w': { x: 1, y: 0 }, 'e': { x: 2, y: 0 }, 'r': { x: 3, y: 0 }, 't': { x: 4, y: 0 },
    'y': { x: 5, y: 0 }, 'u': { x: 6, y: 0 }, 'i': { x: 7, y: 0 }, 'o': { x: 8, y: 0 }, 'p': { x: 9, y: 0 },

    // Row 2
    'a': { x: 0.5, y: 1 }, 's': { x: 1.5, y: 1 }, 'd': { x: 2.5, y: 1 }, 'f': { x: 3.5, y: 1 }, 'g': { x: 4.5, y: 1 },
    'h': { x: 5.5, y: 1 }, 'j': { x: 6.5, y: 1 }, 'k': { x: 7.5, y: 1 }, 'l': { x: 8.5, y: 1 },

    // Row 3
    'z': { x: 1, y: 2 }, 'x': { x: 2, y: 2 }, 'c': { x: 3, y: 2 }, 'v': { x: 4, y: 2 }, 'b': { x: 5, y: 2 },
    'n': { x: 6, y: 2 }, 'm': { x: 7, y: 2 },

    // Special
    ' ': { x: 4.5, y: 3 }
};

export function getKeyCoordinates(key: string): { x: number, y: number } {
    const k = key.toLowerCase();
    const pos = KEY_MAP[k] || { x: 0, y: 0 };
    // Scale up for better geometric resolution
    return { x: pos.x * 40 + 20, y: pos.y * 40 + 20 };
}
