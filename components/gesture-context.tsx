"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { PatternStore } from '@/lib/pattern-store';

// --- Types ---

export type Point = {
    x: number;
    y: number;
    time: number;
    key?: string; // Closest key if known, mainly for debugging/training
};

export type GestureMode = 'VALIDATION' | 'TYPING' | 'DRAWING';

export interface KeyMap {
    [key: string]: { x: number; y: number; width: number; height: number };
}

export interface GestureContextType {
    mode: GestureMode;
    setMode: (mode: GestureMode) => void;

    // Validation
    validationTarget: string | null;
    registerKeyPosition: (char: string, rect: DOMRect) => void;
    isCalibrated: boolean;

    // Typing / Gesture
    activeKeys: Set<string>;
    trajectory: Point[];
    committedText: string;
    predictions: string[];

    // Actions
    selectPrediction: (word: string) => void;
    clearText: () => void;
}

const GestureContext = createContext<GestureContextType | undefined>(undefined);

// --- Constants ---
const VALIDATION_SEQUENCE = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
    'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
    'z', 'x', 'c', 'v', 'b', 'n', 'm'
];

export const GestureProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<GestureMode>('VALIDATION');

    // Calibration State
    const [keyMap, setKeyMap] = useState<KeyMap>({});
    const [validationIndex, setValidationIndex] = useState(0);
    const [isCalibrated, setIsCalibrated] = useState(false);

    // Typing State
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
    const [trajectory, setTrajectory] = useState<Point[]>([]);
    const [committedText, setCommittedText] = useState('');
    const [predictions, setPredictions] = useState<string[]>([]);

    // Pattern Recognition State
    const [lastGestureSequence, setLastGestureSequence] = useState<string | null>(null);
    const [pendingWord, setPendingWord] = useState<string | null>(null);

    // Ref for trajectory to avoid closure staleness in timeout
    const trajectoryRef = useRef<Point[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync ref
    useEffect(() => {
        trajectoryRef.current = trajectory;
    }, [trajectory]);

    // --- Logic ---

    const registerKeyPosition = (char: string, rect: DOMRect) => {
        // Center point
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        setKeyMap(prev => ({
            ...prev,
            [char.toLowerCase()]: { x, y, width: rect.width, height: rect.height }
        }));

        // Advance validation
        if (char.toLowerCase() === VALIDATION_SEQUENCE[validationIndex]) {
            const nextIndex = validationIndex + 1;
            if (nextIndex >= VALIDATION_SEQUENCE.length) {
                setValidationIndex(0);
                setIsCalibrated(true);
                setMode('TYPING');
                console.log("Calibration Complete:", keyMap);
            } else {
                setValidationIndex(nextIndex);
            }
        }
    };

    const handleValidationPress = (key: string) => {
        // This is handled by the visual keyboard component calling registerKeyPosition
        // when it detects a press on the correct key.
        // However, we need to know WHICH key is expected.
    };

    const getSimplifiedSequence = (path: Point[]) => {
        // Basic deduping: h-h-e-e-l-l-o -> helo
        // This is the sequence we use for pattern matching
        if (!path.length) return "";
        const keys = path.map(p => p.key || '').filter(k => k);
        let seq = "";
        let last = "";
        for (const k of keys) {
            if (k !== last) {
                seq += k;
                last = k;
            }
        }
        return seq;
    };

    const processGesture = async () => {
        const path = trajectoryRef.current;
        if (path.length < 5) {
            // Too short, probably just a tap
            setTrajectory([]);
            return;
        }

        const sequence = getSimplifiedSequence(path);
        console.log("Processing Gesture:", sequence);

        // 1. Check Pattern Store
        const localMatch = PatternStore.getMatch(sequence);
        if (localMatch) {
            console.log("Local Pattern Fit Found:", localMatch);
            setPredictions([localMatch, "(Local Pattern)"]);
            setCommittedText(prev => prev + (prev ? ' ' : '') + localMatch);

            // Set pending verification
            setLastGestureSequence(sequence);
            setPendingWord(localMatch);

            setTrajectory([]);
            return; // SKIP API
        }

        console.log("Processing Gesture:", path.length, "points");

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trajectory: path,
                    keyMap,
                    context: committedText
                })
            });

            const data = await response.json();
            if (data.predictions && data.predictions.length > 0) {
                setPredictions(data.predictions);
                // Auto-commit top prediction? The prompt says "First candidate is auto-selected"
                // But usually "auto-selected" means it's inserted but can be changed.
                // For now, let's just show them.
                // Actually prompt says: "The top-ranked word is automatically inserted into the typing area"

                // Let's implement auto-insert of top candidate + space
                const topWord = data.predictions[0];
                setCommittedText(prev => prev + (prev ? ' ' : '') + topWord);

                // Track for potential learning
                setLastGestureSequence(sequence);
                setPendingWord(topWord);
            }
        } catch (e) {
            console.error("Prediction failed:", e);
        } finally {
            // Clear trajectory after processing
            setTrajectory([]);
        }
    };

    // Global Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            // Ignore functional keys
            if (e.key.length > 1 && e.key !== 'Backspace') return;

            if (e.key === 'Backspace') {
                setCommittedText(prev => prev.slice(0, -1));
                setLastGestureSequence(null); // Cancel learning on edit
                setPendingWord(null);
                return;
            }

            setActiveKeys(prev => {
                const newSet = new Set(prev);
                newSet.add(key);
                return newSet;
            });

            if (mode === 'TYPING' && isCalibrated) {
                // IMPLICIT CONFIRMATION LOGIC
                // If we were waiting to see if user accepted the last word, and they start typing a new gesture...
                // Then we confirm it!
                // Note: We use a small check: Is this the START of a new gesture?
                // We can check if trajectory is empty (it should be 0 here since we just started fresh).
                if (trajectory.length === 0 && lastGestureSequence && pendingWord) {
                    console.log("Implicitly confirming:", pendingWord);
                    PatternStore.learnPattern(lastGestureSequence, pendingWord);
                    setLastGestureSequence(null);
                    setPendingWord(null);
                }

                const coords = keyMap[key];
                if (coords) {
                    const point: Point = {
                        x: coords.x,
                        y: coords.y,
                        time: Date.now(),
                        key
                    };

                    setTrajectory(prev => [...prev, point]);

                    // Debounce / Segmentation Logic
                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        processGesture();
                    }, 400); // 400ms pause = end of gesture
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            setActiveKeys(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [mode, isCalibrated, keyMap, validationIndex, lastGestureSequence, pendingWord]); // Added dependencies


    const validationTarget = !isCalibrated && mode === 'VALIDATION'
        ? VALIDATION_SEQUENCE[validationIndex]
        : null;

    const selectPrediction = (word: string) => {
        // Explicit correction!
        // 1. Update text (Fix the last inserted word)
        // Assuming the last inserted word was the 'pendingWord', we replace it.

        if (pendingWord && committedText.endsWith(pendingWord)) {
            // Replace last occurrence
            const newText = committedText.slice(0, -pendingWord.length) + word;
            setCommittedText(newText);
        } else {
            // Fallback just append (shouldn't happen often in this flow)
            setCommittedText(prev => prev + ' ' + word);
        }

        // 2. Learn the CORRECTION
        if (lastGestureSequence) {
            console.log("Explicitly learning correction:", word);
            PatternStore.learnPattern(lastGestureSequence, word);
        }

        // 3. Reset
        setLastGestureSequence(null);
        setPendingWord(null);
    };

    const clearText = () => {
        setCommittedText('');
        setLastGestureSequence(null);
        setPendingWord(null);
    };

    return (
        <GestureContext.Provider value={{
            mode,
            setMode,
            validationTarget,
            registerKeyPosition,
            isCalibrated,
            activeKeys,
            trajectory,
            committedText,
            predictions,
            selectPrediction,
            clearText
        }}>
            {children}
        </GestureContext.Provider>
    );
};

export const useGesture = () => {
    const context = useContext(GestureContext);
    if (context === undefined) {
        throw new Error('useGesture must be used within a GestureProvider');
    }
    return context;
};
