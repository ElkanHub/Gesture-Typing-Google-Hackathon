"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { PatternStore } from '@/lib/pattern-store';
import { getVisualCandidates } from '@/lib/candidate-filter';
import { COMMON_WORDS } from '@/lib/dictionary';
import { Point, KeyMap, GestureMode, Shape } from '@/lib/types';
import { analyzeShape } from '@/lib/shape-logic';

// Points, GestureMode, KeyMap moved to lib/types.ts

export interface GestureContextType {
    mode: GestureMode;
    // ... rest same
    setMode: (mode: GestureMode) => void;
    keyMap: KeyMap;

    // Validation
    validationTarget: string | null;
    registerKeyPosition: (char: string, rect: DOMRect) => void;
    isCalibrated: boolean;

    // Typing / Gesture
    activeKeys: Set<string>;
    trajectory: Point[];
    committedText: string;
    predictions: string[];

    // Ghost Path State (NEW)
    ghostWord: string | null;
    ghostTrajectory: Point[];

    // Actions
    selectPrediction: (word: string) => void;
    clearText: () => void;

    // Debugging
    debugState: {
        lastSequence: string | null;
        anchors: string[];
        rawPath: Point[];
    };

    // Autocomplete (NEW)
    predictedCompletion: string | null;
    acceptCompletion: () => void;

    // Drawing (NEW)
    shapes: Shape[];
    addShape: (shape: Shape) => void;
    updateShape: (id: string, updates: Partial<Shape>) => void;
    removeShape: (id: string) => void;
    clearCanvas: () => void;
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

    // Ghost Path State (NEW)
    const [ghostWord, setGhostWord] = useState<string | null>(null);
    const [ghostTrajectory, setGhostTrajectory] = useState<Point[]>([]);

    // Debug State
    const [debugAnchors, setDebugAnchors] = useState<string[]>([]);

    // Drawing State (NEW)
    const [shapes, setShapes] = useState<Shape[]>([]);
    const addShape = (shape: Shape) => setShapes(prev => [...prev, shape]);
    const updateShape = (id: string, updates: Partial<Shape>) => {
        setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };
    const removeShape = (id: string) => {
        setShapes(prev => prev.filter(s => s.id !== id));
    };
    const clearCanvas = () => setShapes([]);

    // Autocomplete State
    const [predictedCompletion, setPredictedCompletion] = useState<string | null>(null);
    const autocompleteTimerRef = useRef<NodeJS.Timeout | null>(null);


    // --- Focus & Auto-Mode Logic ---
    useEffect(() => {
        const handleFocusChange = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            const tagName = target.tagName;
            const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA';
            const isCanvas = target.getAttribute('data-mode') === 'drawing';

            if (isCanvas) {
                console.log("Canvas focused -> DRAWING mode");
                setMode('DRAWING');
            } else if (isInput) {
                console.log("Input focused -> TYPING mode");
                setMode('TYPING'); // Assuming 'TYPING' covers gesture typing
            }
        };

        // Listen for focusin (bubbles) from document
        document.addEventListener('focusin', handleFocusChange);
        return () => document.removeEventListener('focusin', handleFocusChange);
    }, []);

    const insertTextIntoActiveElement = (text: string) => {
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
            // Fallback to internal state if no native input focused
            setCommittedText(prev => prev + text);
            return;
        }

        // Programmatic insert
        const start = active.selectionStart || 0;
        const end = active.selectionEnd || 0;

        // Use setRangeText to preserve undo history if possible (modern browsers)
        // or just value manipulation
        active.setRangeText(text, start, end, 'end');

        // Dispatch input event so React/Frameworks pick it up
        const event = new Event('input', { bubbles: true });
        active.dispatchEvent(event);

        // Sync internal state just in case
        setCommittedText(active.value);
    };

    // Autocomplete Timer (Existing)
    useEffect(() => {
        if (!committedText || committedText.length < 5) {
            setPredictedCompletion(null);
            return;
        }

        // Debounce 
        if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);

        autocompleteTimerRef.current = setTimeout(async () => {
            // Basic heuristic: Don't predict if we are in middle of word (trailing space check?)
            // Actually, context is context.
            try {
                const res = await fetch('/api/autocomplete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ context: committedText })
                });
                const data = await res.json();
                if (data.completion) {
                    setPredictedCompletion(data.completion);
                } else {
                    setPredictedCompletion(null);
                }
            } catch (e) {
                console.error("Autocomplete failed", e);
            }
        }, 1000); // Wait 1s linear idle before predicting sentence

        return () => {
            if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
        }
    }, [committedText]);

    const acceptCompletion = () => {
        if (predictedCompletion) {
            setCommittedText(prev => prev + predictedCompletion);
            setPredictedCompletion(null);
        }
    };

    // Ref for trajectory to avoid closure staleness in timeout
    const trajectoryRef = useRef<Point[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync ref
    useEffect(() => {
        trajectoryRef.current = trajectory;
    }, [trajectory]);

    // --- Logic ---

    const registerKeyPosition = (char: string, rect: DOMRect) => {
        setKeyMap(prev => {
            // Optimization: Don't update if nothing changed (avoids render loops)
            const existing = prev[char.toLowerCase()];
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            if (existing && existing.x === x && existing.y === y && existing.width === rect.width && existing.height === rect.height) {
                return prev;
            }

            return {
                ...prev,
                [char.toLowerCase()]: { x, y, width: rect.width, height: rect.height }
            };
        });
    };

    // Auto-Calibrate when map is full
    useEffect(() => {
        if (isCalibrated) return;
        const registeredCount = Object.keys(keyMap).length;
        // Basic check: If we have > 26 keys (A-Z), we assume map is ready.
        if (registeredCount >= 26) {
            console.log("Calibration Complete (Auto):", registeredCount, "keys");
            setIsCalibrated(true);
            // Only switch to TYPING if we are currently in VALIDATION (don't overwrite DRAWING)
            setMode(prev => prev === 'VALIDATION' ? 'TYPING' : prev);
            setValidationIndex(0);
        }
    }, [keyMap, isCalibrated]);

    const generateGhostPath = (word: string): Point[] => {
        if (!word) return [];
        const path: Point[] = [];
        const now = Date.now();

        for (let i = 0; i < word.length; i++) {
            const char = word[i].toLowerCase();
            const keyInfo = keyMap[char];
            if (keyInfo) {
                path.push({
                    x: keyInfo.x,
                    y: keyInfo.y,
                    time: now + (i * 50),
                    key: char
                });
            }
        }
        return path;
    };

    const analyzeTrajectory = (path: Point[]) => {
        if (!path.length) return { sequence: "", anchors: [] as string[] };

        const grouped: { key: string; startTime: number; endTime: number; count: number; x: number; y: number }[] = [];

        let currentGroup = {
            key: path[0].key || '',
            startTime: path[0].time,
            endTime: path[0].time,
            count: 1,
            x: path[0].x,
            y: path[0].y
        };

        for (let i = 1; i < path.length; i++) {
            const p = path[i];
            const key = p.key || '';
            if (key === currentGroup.key) {
                currentGroup.endTime = p.time;
                currentGroup.count++;
                currentGroup.x = p.x;
                currentGroup.y = p.y;
            } else {
                grouped.push(currentGroup);
                currentGroup = { key, startTime: p.time, endTime: p.time, count: 1, x: p.x, y: p.y };
            }
        }
        grouped.push(currentGroup);

        const durations = grouped.map(g => g.endTime - g.startTime);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);

        const dwellAnchors = grouped.filter((g, i) => {
            const duration = durations[i];
            return duration > (avgDuration * 1.3);
        }).map(g => g.key);

        const inflectionAnchors: string[] = [];
        if (grouped.length > 2) {
            for (let i = 1; i < grouped.length - 1; i++) {
                const prev = grouped[i - 1];
                const curr = grouped[i];
                const next = grouped[i + 1];

                const dx1 = curr.x - prev.x;
                const dy1 = curr.y - prev.y;
                const dx2 = next.x - curr.x;
                const dy2 = next.y - curr.y;

                const angle1 = Math.atan2(dy1, dx1);
                const angle2 = Math.atan2(dy2, dx2);
                let diff = Math.abs(angle1 - angle2);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;

                const degrees = diff * (180 / Math.PI);
                if (degrees > 45) {
                    inflectionAnchors.push(curr.key);
                }
            }
        }

        const startKey = grouped[0].key;
        const endKey = grouped[grouped.length - 1].key;

        const anchors = Array.from(new Set([
            startKey,
            ...dwellAnchors,
            ...inflectionAnchors,
            endKey
        ]));

        const cleanAnchors = anchors.filter(k => k);
        const sequence = grouped.map(g => g.key).filter(k => k).join('');

        return { sequence, anchors: cleanAnchors };
    };

    const processGesture = async () => {
        const path = trajectoryRef.current;

        if (path.length > 0 && path.length < 4) {
            // @ts-ignore
            const literalText = path.map(p => p.originalKey || p.key).join('');

            // Insert literal text into focus target
            insertTextIntoActiveElement(literalText);

            setTrajectory([]);
            setGhostWord(null);
            setGhostTrajectory([]);
            return;
        }

        if (path.length === 0) return;

        const { sequence, anchors } = analyzeTrajectory(path);

        console.log("Processing Gesture:", sequence);
        console.log("Anchors Identified:", anchors);

        setDebugAnchors(anchors);

        // Anchor Match (NEW): Check if anchors spell a valid word
        const anchorWord = anchors.join('');
        if (anchorWord.length >= 3 && COMMON_WORDS.includes(anchorWord)) {
            console.log("Anchor Match Found:", anchorWord);
            setPredictions([anchorWord, "(Anchor Match)"]);

            // INSERT TEXT
            const textToInsert = (committedText ? ' ' : '') + anchorWord;
            insertTextIntoActiveElement(textToInsert);

            setLastGestureSequence(sequence);
            setPendingWord(anchorWord);
            setTrajectory([]);
            setGhostWord(null);
            setGhostTrajectory([]);
            setDebugAnchors(anchors); // Ensure debug updates
            return;
        }

        setDebugAnchors(anchors); // Ensure debug updates

        if (mode === 'DRAWING') {
            const shapeData = analyzeShape(path);
            if (shapeData) {
                console.log("Recognized Shape:", shapeData.type);

                // Calculate Keyboard Bounds for Normalization
                const keys = Object.values(keyMap);
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

                if (keys.length > 0) {
                    keys.forEach(k => {
                        const left = k.x - k.width / 2;
                        const right = k.x + k.width / 2;
                        const top = k.y - k.height / 2;
                        const bottom = k.y + k.height / 2;

                        if (left < minX) minX = left;
                        if (right > maxX) maxX = right;
                        if (top < minY) minY = top;
                        if (bottom > maxY) maxY = bottom;
                    });

                    const kbWidth = maxX - minX;
                    const kbHeight = maxY - minY;

                    // Avoid division by zero
                    const safeW = kbWidth || 1;
                    const safeH = kbHeight || 1;

                    const newShape: Shape = {
                        id: Date.now().toString(),
                        type: shapeData.type as any,
                        // Force center (0.5) to ensure visibility as per user request
                        x: 0.5,
                        y: 0.5,
                        width: shapeData.width / safeW,
                        height: shapeData.height / safeH,
                        color: '#000000'
                    };
                    setShapes(prev => [...prev, newShape]);
                } else {
                    console.warn("No keys in KeyMap! Using shape bounds for normalization (Fallback)");
                    // Fallback: Normalize relative to itself (center it) or screen? 
                    // Let's just put it in the center.
                    const newShape: Shape = {
                        id: Date.now().toString(),
                        type: shapeData.type as any, // Cast for safely
                        x: 0.5,
                        y: 0.5,
                        width: 0.2, // Default size
                        height: 0.2,
                        color: '#000000'
                    };
                    setShapes(prev => [...prev, newShape]);
                }
            }
            setTrajectory([]);
            return;
        }

        if (mode === 'TRAINING') {
            console.log("Training Mode: Sequence Captured", sequence);
            setLastGestureSequence(sequence);
            setTrajectory([]);
            return; // Skip prediction and insertion
        }

        const localMatch = PatternStore.getMatch(sequence);
        if (localMatch) {
            console.log("Local Pattern Fit Found:", localMatch);
            setPredictions([localMatch, "(Local Pattern)"]);
            setCommittedText(prev => prev + (prev ? ' ' : '') + localMatch);
            setLastGestureSequence(sequence);
            setPendingWord(localMatch);
            setTrajectory([]);
            setGhostWord(null);
            setGhostTrajectory([]);
            setDebugAnchors(anchors); // Ensure debug updates
            return;
        }

        const candidates = getVisualCandidates(path, anchors, keyMap);
        console.log("Filtered Candidates:", candidates);

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trajectory: path,
                    anchors,
                    candidates,
                    keyMap,
                    context: committedText
                })
            });

            const data = await response.json();
            if (data.predictions && data.predictions.length > 0) {
                setPredictions(data.predictions);
                const topWord = data.predictions[0];

                // INSERT TEXT
                const textToInsert = (committedText ? ' ' : '') + topWord;
                insertTextIntoActiveElement(textToInsert);

                setLastGestureSequence(sequence);
                setPendingWord(topWord);

                // Handle Ghost Path
                if (data.next_word) {
                    console.log("Ghost Word Predicted:", data.next_word);
                    setGhostWord(data.next_word);
                    setGhostTrajectory(generateGhostPath(data.next_word));
                } else {
                    setGhostWord(null);
                    setGhostTrajectory([]);
                }
            }
        } catch (e) {
            console.error("Prediction failed:", e);
        } finally {
            setTrajectory([]);
        }
    };

    // Global Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const originalKey = e.key;

            // Handle TAB: Ghost Word -> Autocomplete Step
            if (e.key === 'Tab') {
                if (ghostWord) {
                    e.preventDefault();
                    setCommittedText(prev => prev + ' ' + ghostWord);
                    setGhostWord(null);
                    setGhostTrajectory([]);
                    return;
                }

                if (predictedCompletion) {
                    e.preventDefault();
                    // Regex to find next word (including preceding whitespace)
                    const match = predictedCompletion.match(/^(\s*\S+)([\s\S]*)/);
                    if (match) {
                        const nextWord = match[1];
                        const remainder = match[2];
                        setCommittedText(prev => prev + nextWord);
                        setPredictedCompletion(remainder || null);
                    }
                    return;
                }
            }

            // Handle ENTER for Autocomplete
            if (e.key === 'Enter') {
                if (predictedCompletion) {
                    e.preventDefault();
                    setCommittedText(prev => prev + predictedCompletion);
                    setPredictedCompletion(null);
                    return;
                }
            }

            if (e.key === ' ') {
                setCommittedText(prev => prev + ' ');
                if (lastGestureSequence && pendingWord) {
                    PatternStore.learnPattern(lastGestureSequence, pendingWord);
                    setLastGestureSequence(null);
                    setPendingWord(null);
                }
                setTrajectory([]);
                setGhostWord(null);
                setGhostTrajectory([]);
                return;
            }

            if (e.key.length > 1 && e.key !== 'Backspace') return;

            if (e.key === 'Backspace') {
                setCommittedText(prev => prev.slice(0, -1));
                setLastGestureSequence(null);
                setPendingWord(null);
                setTrajectory([]);
                setGhostWord(null);
                setGhostTrajectory([]);
                return;
            }

            setActiveKeys(prev => {
                const newSet = new Set(prev);
                newSet.add(key);
                return newSet;
            });

            if ((mode === 'TYPING' || mode === 'DRAWING' || mode === 'TRAINING') && isCalibrated) {
                if (trajectory.length === 0 && lastGestureSequence && pendingWord) {
                    console.log("Implicitly confirming:", pendingWord);
                    PatternStore.learnPattern(lastGestureSequence, pendingWord);
                    setLastGestureSequence(null);
                    setPendingWord(null);
                }

                const coords = keyMap[key];
                if (coords) {
                    // Prevent native character insertion to avoid double-typing (raw + predicted)
                    e.preventDefault();

                    const point: Point = {
                        x: coords.x,
                        y: coords.y,
                        time: Date.now(),
                        key,
                        originalKey
                    };

                    setTrajectory(prev => [...prev, point]);

                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        processGesture();
                    }, 400);
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
    }, [mode, isCalibrated, keyMap, validationIndex, lastGestureSequence, pendingWord, ghostWord, predictedCompletion]);


    const validationTarget = !isCalibrated && mode === 'VALIDATION'
        ? VALIDATION_SEQUENCE[validationIndex]
        : null;

    const selectPrediction = (word: string) => {
        if (pendingWord && committedText.endsWith(pendingWord)) {
            const newText = committedText.slice(0, -pendingWord.length) + word;
            setCommittedText(newText);
        } else {
            setCommittedText(prev => prev + ' ' + word);
        }

        if (lastGestureSequence) {
            console.log("Implicitly Learn:", lastGestureSequence, "->", word);
            PatternStore.learnPattern(lastGestureSequence, word);
        }

        setLastGestureSequence(null);
        setPendingWord(null);
    };

    const clearText = () => {
        setCommittedText('');
        setLastGestureSequence(null);
        setPendingWord(null);
        setGhostWord(null);
        setGhostTrajectory([]);
    };

    return (
        <GestureContext.Provider value={{
            mode,
            setMode,
            keyMap,
            validationTarget,
            registerKeyPosition,
            isCalibrated,
            activeKeys,
            trajectory,
            committedText,
            predictions,
            ghostWord,
            ghostTrajectory,
            selectPrediction,
            clearText,
            debugState: {
                lastSequence: lastGestureSequence || (trajectory.length > 0 ? "..." : null),
                anchors: debugAnchors,
                rawPath: trajectory
            },
            predictedCompletion,
            acceptCompletion,
            shapes,
            addShape,
            updateShape,
            removeShape,
            clearCanvas
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
