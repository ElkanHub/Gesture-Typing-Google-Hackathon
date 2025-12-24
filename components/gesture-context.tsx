"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { PatternStore } from '@/lib/pattern-store';
import { getVisualCandidates } from '@/lib/candidate-filter';

// --- Types ---

export type Point = {
    x: number;
    y: number;
    time: number;
    key?: string;
    originalKey?: string;
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
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        setKeyMap(prev => ({
            ...prev,
            [char.toLowerCase()]: { x, y, width: rect.width, height: rect.height }
        }));

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

    const analyzeTrajectory = (path: Point[]) => {
        if (!path.length) return { sequence: "", anchors: [] as string[] };

        // 1. Group by Key and calculate Dwell Time (Consolidate contiguous keys)
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

        // 2. Identify Dwell Anchors
        const durations = grouped.map(g => g.endTime - g.startTime);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);

        const dwellAnchors = grouped.filter((g, i) => {
            const duration = durations[i];
            return duration > (avgDuration * 1.3);
        }).map(g => g.key);

        // 3. Identify Inflection Points
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

        // 4. Constants
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
            setCommittedText(prev => prev + literalText);
            setTrajectory([]);
            return;
        }

        if (path.length === 0) return;

        // Perform Analysis
        const { sequence, anchors } = analyzeTrajectory(path);

        console.log("Processing Gesture:", sequence);
        console.log("Anchors Identified:", anchors);

        // 1. Check Pattern Store
        const localMatch = PatternStore.getMatch(sequence);
        if (localMatch) {
            console.log("Local Pattern Fit Found:", localMatch);
            setPredictions([localMatch, "(Local Pattern)"]);
            setCommittedText(prev => prev + (prev ? ' ' : '') + localMatch);
            setLastGestureSequence(sequence);
            setPendingWord(localMatch);
            setTrajectory([]);
            return;
        }

        // 2. Candidate Filtering
        const candidates = getVisualCandidates(path, anchors);
        console.log("Filtered Candidates:", candidates);

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trajectory: path,
                    anchors,
                    candidates, // NEW
                    keyMap,
                    context: committedText
                })
            });

            const data = await response.json();
            if (data.predictions && data.predictions.length > 0) {
                setPredictions(data.predictions);
                const topWord = data.predictions[0];
                setCommittedText(prev => prev + (prev ? ' ' : '') + topWord);

                // Track for potential learning
                setLastGestureSequence(sequence);
                setPendingWord(topWord);
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

            if (e.key === ' ') {
                setCommittedText(prev => prev + ' ');
                if (lastGestureSequence && pendingWord) {
                    PatternStore.learnPattern(lastGestureSequence, pendingWord);
                    setLastGestureSequence(null);
                    setPendingWord(null);
                }
                setTrajectory([]);
                return;
            }

            if (e.key.length > 1 && e.key !== 'Backspace') return;

            if (e.key === 'Backspace') {
                setCommittedText(prev => prev.slice(0, -1));
                setLastGestureSequence(null);
                setPendingWord(null);
                setTrajectory([]);
                return;
            }

            setActiveKeys(prev => {
                const newSet = new Set(prev);
                newSet.add(key);
                return newSet;
            });

            if (mode === 'TYPING' && isCalibrated) {
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
                        key,
                        originalKey
                    };

                    setTrajectory(prev => [...prev, point]);

                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        processGesture();
                    }, 400);
                } else {
                    if (e.key.length === 1) {
                        setCommittedText(prev => prev + originalKey);
                    }
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
    }, [mode, isCalibrated, keyMap, validationIndex, lastGestureSequence, pendingWord]);


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
            console.log("Explicitly learning correction:", word);
            PatternStore.learnPattern(lastGestureSequence, word);
        }

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
