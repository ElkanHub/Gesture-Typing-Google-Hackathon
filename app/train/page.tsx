"use client";

import { useGesture } from "@/components/gesture-context";
import { Keyboard } from "@/components/ui/keyboard";
import { PatternStore } from "@/lib/pattern-store";
import { useEffect, useState, useRef } from "react";
import Link from 'next/link';

export default function TrainingPage() {
    const {
        setMode,
        debugState,
        clearText,
        keyMap
    } = useGesture();

    // Local State
    const [targetWord, setTargetWord] = useState("");
    const [scannedWord, setScannedWord] = useState(""); // Confirmed target word
    const [attempts, setAttempts] = useState<string[]>([]);
    const [currentRawStream, setCurrentRawStream] = useState("");
    const [lastSavedSequence, setLastSavedSequence] = useState("");

    // Ref to track processing to avoid duplicate saves if gesture context updates rapidly
    const lastProcessedSequenceRef = useRef<string | null>(null);

    // 1. Initialize Mode
    useEffect(() => {
        setMode('TRAINING');
        return () => setMode('VALIDATION'); // Cleanup
    }, [setMode]);

    // 2. Monitor Sequence (Live + Final)
    const { trajectory } = useGesture();

    useEffect(() => {
        // If actively gesturing, show the live path
        if (trajectory.length > 0) {
            // Simple Run-Length Encoding for display
            const live = trajectory
                .map(p => p.key)
                .filter((k, i, arr) => i === 0 || k !== arr[i - 1]) // Remove consecutive partials
                .join('');
            setCurrentRawStream(live);
        }
        // If gesture ended (trajectory empty) and we have a result
        else if (debugState.lastSequence && debugState.lastSequence !== '...') {
            // Update to the official recognized sequence (which might include dwell/inflection logic)
            setCurrentRawStream(debugState.lastSequence);
        }
    }, [trajectory, debugState.lastSequence]);

    // Handle User Actions
    const handleConfirmAttempt = () => {
        if (!scannedWord) return;
        if (!currentRawStream) return;

        // Save to Pattern Store
        console.log(`Learning: ${currentRawStream} -> ${scannedWord}`);
        PatternStore.learnPattern(currentRawStream, scannedWord);

        const newAttempts = [...attempts, currentRawStream];
        setAttempts(newAttempts);
        setLastSavedSequence(currentRawStream);

        // Clear for next attempt
        setCurrentRawStream("");
        lastProcessedSequenceRef.current = null;
        clearText(); // Clear context state

        if (newAttempts.length >= 3) {
            // Done with this word
            // We can auto-reset or wait for user. Let's wait for user to start new word.
        }
    };

    const handleRetry = () => {
        setCurrentRawStream("");
        lastProcessedSequenceRef.current = null;
        clearText();
    };

    const handleSetWord = () => {
        if (targetWord.trim().length > 0) {
            setScannedWord(targetWord.trim().toLowerCase());
            setAttempts([]);
            setCurrentRawStream("");
            setLastSavedSequence("");
        }
    };

    const handleReset = () => {
        setScannedWord("");
        setTargetWord("");
        setAttempts([]);
        setCurrentRawStream("");
        setLastSavedSequence("");
    }

    // Global Key Handlers for Enter/Backspace on this page specific logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Avoid interfering with input if user is typing the word
            const active = document.activeElement;
            const isInput = active && (active.tagName === 'INPUT');
            if (isInput) return;

            if (e.key === 'Enter') {
                if (scannedWord && currentRawStream && attempts.length < 3) {
                    handleConfirmAttempt();
                } else if (attempts.length >= 3) {
                    handleReset();
                }
            }
            if (e.key === 'Backspace') {
                // Context handles clearing its own state, we clear our local view
                handleRetry();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [scannedWord, currentRawStream, attempts, targetWord]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center">
            {/* Header */}
            <div className="w-full bg-white border-b p-4 flex items-center justify-between px-8">
                <Link href="/" className="text-gray-500 hover:text-black font-medium text-sm">← Back to Keyboard</Link>
                <h1 className="text-lg font-bold text-gray-800 tracking-tight">Pattern Training Lab</h1>
                <div className="w-20"></div>
            </div>

            <div className="flex-1 w-full max-w-4xl p-8 flex flex-col gap-8">

                {/* Stage 1: Input Word */}
                {!scannedWord ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">What word do you want to train?</h2>
                        <div className="flex gap-2 shadow-sm">
                            <input
                                className="border border-gray-300 rounded-l-xl outline-none text-2xl px-6 py-4 font-mono w-80 text-center uppercase focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="TYPE WORD"
                                value={targetWord}
                                onChange={(e) => setTargetWord(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSetWord()}
                                autoFocus
                            />
                            <button
                                onClick={handleSetWord}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-r-xl font-bold text-lg transition-colors"
                            >
                                BEGIN
                            </button>
                        </div>
                        <p className="mt-4 text-gray-400 text-sm">Type a word and press Enter to start recording gestures.</p>
                    </div>
                ) : (
                    // Stage 2: Recording
                    <div className="flex flex-col items-center w-full gap-6 animate-in slide-in-from-bottom-8 duration-500">

                        {/* Progress Header */}
                        <div className="w-full flex justify-between items-end border-b pb-4">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Training Target</div>
                                <div className="text-5xl font-black text-gray-800 uppercase tracking-tighter">{scannedWord}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-6xl font-black text-gray-200 leading-none">
                                    {attempts.length < 3 ? attempts.length + 1 : 3}<span className="text-3xl text-gray-300"> / 3</span>
                                </div>
                            </div>
                        </div>

                        {/* SUCCESS STATE */}
                        {attempts.length >= 3 ? (
                            <div className="w-full bg-green-50 border border-green-200 rounded-xl p-8 text-center animate-in zoom-in spin-in-1">
                                <div className="text-4xl mb-4">✅</div>
                                <h3 className="text-xl font-bold text-green-800 mb-2">Training Complete</h3>
                                <p className="text-green-600 mb-6">The pattern for <b>{scannedWord}</b> has been saved to the dictionary.</p>
                                <button
                                    onClick={handleReset}
                                    className="bg-black text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                                >
                                    Train Another Word
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Raw Stream Monitor */}
                                <div className="w-full bg-[#0d1117] rounded-xl overflow-hidden shadow-2xl border border-gray-800 relative group">
                                    <div className="px-4 py-2 bg-[#161b22] border-b border-gray-800 flex justify-between items-center">
                                        <span className="text-xs font-mono text-gray-400 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                            LIVE INPUT STREAM
                                        </span>
                                        <span className="text-xs font-mono text-gray-500">NO_CORRECTION_MODE</span>
                                    </div>

                                    <div className="p-6 font-mono text-lg min-h-[160px] flex flex-col justify-end">
                                        {/* Scanlines / Effect */}
                                        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

                                        {/* History Ghost */}
                                        {lastSavedSequence && (
                                            <div className="text-gray-600 opacity-50 mb-2 select-none">
                                                Last: {lastSavedSequence}
                                            </div>
                                        )}

                                        {/* Active Stream */}
                                        {currentRawStream ? (
                                            <div className="break-all leading-relaxed animate-in fade-in">
                                                <span className="text-blue-400">{currentRawStream}</span>
                                                <span className="inline-block w-3 h-5 bg-blue-500 ml-1 animate-pulse align-middle"></span>
                                            </div>
                                        ) : (
                                            <div className="text-gray-600 italic">
                                                Listening for gesture... <br />
                                                <span className="text-xs not-italic text-gray-700">Swipe "{scannedWord}" on the keyboard below</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bar */}
                                    {currentRawStream && (
                                        <div className="bg-[#161b22] border-t border-gray-800 p-3 flex justify-end gap-3 animate-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300">BACKSPACE</kbd>
                                                Retry
                                            </div>
                                            <button
                                                onClick={handleConfirmAttempt}
                                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-1 rounded text-xs font-bold flex items-center gap-2 transition-colors"
                                            >
                                                <kbd className="bg-green-700 bg-opacity-50 px-2 py-0.5 rounded text-green-100">ENTER</kbd>
                                                SAVE PATTERN
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Keyboard Area */}
                                <div className="w-full relative">
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest z-10">
                                        Touch Input Area
                                    </div>
                                    <div className="pt-8">
                                        <Keyboard />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
