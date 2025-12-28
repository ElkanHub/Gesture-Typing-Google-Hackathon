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
        keyMap,
        isCalibrated
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

            {/* Background decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            </div>

            {/* Consistent Glass Header */}
            <header className="z-50 w-full max-w-7xl flex items-center justify-between px-6 py-4 rounded-2xl border border-white/50 bg-white/70 backdrop-blur-xl shadow-sm mb-8 sticky top-4 mt-4">
                <Link href="/" className="flex items-center gap-2 group text-gray-500 hover:text-black transition-colors">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    <span className="font-medium">Back to Keyboard</span>
                </Link>
                <div className="flex items-center gap-3">
                    <span className="text-xl">🎓</span>
                    <h1 className="font-semibold text-gray-800 tracking-tight">Pattern Training Lab</h1>
                </div>
                <div className="w-24"></div> {/* Spacer for balance */}
            </header>

            <div className="flex-1 w-full max-w-4xl p-8 flex flex-col gap-8 z-10">

                {/* Stage 1: Input Word */}
                {!scannedWord ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center gap-6 w-full max-w-lg">
                            <h2 className="text-2xl font-bold text-gray-900">What word do you want to train?</h2>

                            <div className="relative w-full group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                                <div className="relative flex shadow-sm bg-white rounded-xl overflow-hidden">
                                    <input
                                        className="flex-1 outline-none text-2xl px-6 py-4 font-mono text-center uppercase text-gray-800 placeholder:text-gray-300"
                                        placeholder="TYPE WORD"
                                        value={targetWord}
                                        onChange={(e) => setTargetWord(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSetWord()}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSetWord}
                                        className="bg-black hover:bg-gray-900 text-white px-8 font-bold text-lg transition-colors border-l border-gray-100"
                                    >
                                        BEGIN
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm">Type a word and press Enter to start recording gestures.</p>
                        </div>
                    </div>
                ) : (
                    // Stage 2: Recording
                    <div className="flex flex-col items-center w-full gap-6 animate-in slide-in-from-bottom-8 duration-500">

                        {/* Progress Header */}
                        <div className="w-full flex justify-between items-end border-b border-gray-200 pb-4">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Training Target</div>
                                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 uppercase tracking-tighter">{scannedWord}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-6xl font-black text-gray-100 leading-none">
                                    {attempts.length < 3 ? attempts.length + 1 : 3}<span className="text-3xl text-gray-200">/3</span>
                                </div>
                            </div>
                        </div>

                        {/* SUCCESS STATE */}
                        {attempts.length >= 3 ? (
                            <div className="w-full bg-white border border-green-100 rounded-3xl p-12 text-center animate-in zoom-in spin-in-1 shadow-2xl shadow-green-900/5">
                                <div className="text-6xl mb-6">✅</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Training Complete</h3>
                                <p className="text-gray-500 mb-8 max-w-md mx-auto">The pattern for <b className="text-green-600">{scannedWord}</b> has been saved to your local dictionary and is ready for use.</p>
                                <button
                                    onClick={handleReset}
                                    className="bg-black text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                                >
                                    Train Another Word
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Raw Stream Monitor */}
                                <div className="w-full bg-[#0d1117] rounded-2xl overflow-hidden shadow-2xl border border-gray-800 relative group ring-4 ring-gray-100">
                                    <div className="px-4 py-3 bg-[#161b22] border-b border-gray-800 flex justify-between items-center">
                                        <span className="text-xs font-mono text-gray-400 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                                            LIVE INPUT STREAM
                                        </span>
                                        <span className="text-xs font-mono text-gray-600 px-2 py-1 bg-gray-900 rounded">RAW_CAPTURE_MODE</span>
                                    </div>

                                    <div className="p-8 font-mono text-lg min-h-[180px] flex flex-col justify-end relative">
                                        {/* Scanlines / Effect */}
                                        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

                                        {/* History Ghost */}
                                        {lastSavedSequence && (
                                            <div className="text-gray-700 mb-2 select-none">
                                                Last: {lastSavedSequence}
                                            </div>
                                        )}

                                        {/* Active Stream */}
                                        {currentRawStream ? (
                                            <div className="break-all leading-relaxed animate-in fade-in slide-in-from-left-2">
                                                <span className="text-blue-400 text-2xl tracking-wide">{currentRawStream}</span>
                                                <span className="inline-block w-3 h-6 bg-blue-500 ml-1 animate-pulse align-middle shadow-[0_0_8px_rgb(59,130,246)]"></span>
                                            </div>
                                        ) : (
                                            <div className="text-gray-700 italic flex flex-col items-center justify-center h-full py-8 opacity-50">
                                                <span className="text-3xl mb-2 opacity-20">📡</span>
                                                Listening for signal...
                                                <span className="text-xs not-italic text-gray-600 mt-2">Perform gesture on keyboard below</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bar */}
                                    {currentRawStream && (
                                        <div className="bg-[#161b22] border-t border-gray-800 p-4 flex justify-end gap-4 animate-in slide-in-from-bottom-2">
                                            <button
                                                onClick={handleRetry}
                                                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                                            >
                                                <kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300 font-mono">BACKSPACE</kbd>
                                                <span>Clear</span>
                                            </button>
                                            <button
                                                onClick={handleConfirmAttempt}
                                                className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-3 transition-all shadow-lg shadow-green-900/20"
                                            >
                                                <span>SAVE PATTERN</span>
                                                <kbd className="bg-black/20 px-2 py-1 rounded text-green-100 font-mono">ENTER</kbd>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Keyboard Area */}
                                <div className="w-full relative mt-4">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 text-gray-400 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest z-10 shadow-sm">
                                        Input Surface
                                    </div>
                                    <div className="pt-8 opacity-90 hover:opacity-100 transition-opacity">
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
