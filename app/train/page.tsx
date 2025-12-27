"use client";

import { useEffect, useState } from 'react';
import { useGesture } from '@/components/gesture-context';
import { PatternStore } from '@/lib/pattern-store';
import { Keyboard } from '@/components/ui/keyboard';
import Link from 'next/link';

export default function TrainingPage() {
    const {
        isCalibrated,
        mode,
        setMode,
        debugState, // Access lastSequence from debugState since we don't expose lastGestureSequence directly in context return?
        // Wait, check GestureContext export. 
        // It exposes: activeKeys, trajectory, committedText, predictions...
        // It exposes debugState which has { lastSequence }.
    } = useGesture();

    const [targetWord, setTargetWord] = useState('');
    const [step, setStep] = useState(0); // 0=Input, 1=Swipe1, 2=Swipe2, 3=Swipe3, 4=Done
    const [statusColor, setStatusColor] = useState('bg-gray-100');
    const [lastcaptured, setLastCaptured] = useState<string | null>(null);

    // Set mode to TRAINING on mount
    useEffect(() => {
        if (isCalibrated) {
            setMode('TRAINING');
        }
        return () => {
            // Cleanup handled by context or next page? 
            // Ideally set back to TYPING if leaving? 
            // Context usually defaults or persists. safely let user switch.
        };
    }, [isCalibrated, setMode]);

    // Listen for new sequences
    useEffect(() => {
        // debugState.lastSequence is updated by processGesture in TRAINING mode.
        // It returns "..." when drawing, or the sequence string when done.
        // Wait, processGesture sets lastGestureSequence. debugState.lastSequence reads it.
        // But processGesture ALSO sets trajectory to [].
        // In TRAINING mode, I updated processGesture to: setLastGestureSequence(sequence); setTrajectory([]);

        const seq = debugState.lastSequence;
        if (seq && seq !== '...' && seq !== lastcaptured && step > 0 && step < 4) {
            setLastCaptured(seq);
            handleTrainingSwipe(seq);
        }
    }, [debugState.lastSequence, step, lastcaptured]);

    const handleTrainingSwipe = (sequence: string) => {
        // Save the pattern
        PatternStore.learnPattern(sequence, targetWord);

        // Advance step
        setStep(prev => prev + 1);

        // Feedback
        setStatusColor('bg-green-100');
        setTimeout(() => setStatusColor('bg-gray-100'), 500);
    };

    const startTraining = () => {
        if (!targetWord) return;
        setStep(1);
        setLastCaptured(null);
    };

    const reset = () => {
        setStep(0);
        setTargetWord('');
        setLastCaptured(null);
    };

    if (!isCalibrated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center text-gray-600">
                <h1 className="text-2xl font-bold mb-4">Calibration Required</h1>
                <p className="mb-8">Please calibrate the keyboard on the home page first.</p>
                <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Go Home
                </Link>
            </div>
        );
    }

    return (
        <main className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="p-4 bg-white shadow-sm flex items-center justify-between">
                <Link href="/" className="text-gray-500 hover:text-gray-900 font-medium">← Back</Link>
                <h1 className="text-xl font-bold text-gray-800">Gesture Training Lab</h1>
                <div className="w-16"></div>
            </header>

            <div className="flex-1 flex flex-col items-center p-8 max-w-2xl mx-auto w-full gap-8">

                {/* Step 0: Input Word */}
                {step === 0 && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border w-full text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-2xl font-semibold text-gray-800">Train a New Word</h2>
                        <p className="text-gray-500">Teach the AI your unique swipe pattern for tricky words or names.</p>

                        <div className="flex gap-2 justify-center mt-4">
                            <input
                                type="text"
                                value={targetWord}
                                onChange={(e) => setTargetWord(e.target.value)}
                                placeholder="Enter word (e.g. 'Supabase')"
                                className="px-4 py-3 border rounded-xl text-lg w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && startTraining()}
                            />
                            <button
                                onClick={startTraining}
                                disabled={!targetWord}
                                className="px-6 py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
                            >
                                Start
                            </button>
                        </div>
                    </div>
                )}

                {/* Training Steps */}
                {step > 0 && step < 4 && (
                    <div className={`transition-colors duration-300 ${statusColor} p-8 rounded-2xl border w-full text-center space-y-6 animate-in zoom-in-95`}>
                        <div>
                            <h2 className="text-4xl font-bold text-gray-900 mb-2">{targetWord}</h2>
                            <p className="text-gray-500 font-medium">Swipe this word on your keyboard</p>
                        </div>

                        <div className="flex justify-center gap-4 my-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`
                                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all
                                    ${step > i ? 'bg-green-500 text-white' : step === i ? 'bg-blue-600 text-white scale-110 ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'}
                                `}>
                                    {step > i ? '✓' : i}
                                </div>
                            ))}
                        </div>

                        <div className="text-sm text-gray-400">
                            Pattern: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{lastcaptured || 'Waiting...'}</code>
                        </div>
                    </div>
                )}

                {/* Success */}
                {step === 4 && (
                    <div className="bg-green-50 p-8 rounded-2xl border border-green-100 w-full text-center space-y-6 animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                            🎉
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Training Complete!</h2>
                            <p className="text-green-700 mt-2">The system has learned your pattern for <b>{targetWord}</b>.</p>
                        </div>

                        <button
                            onClick={reset}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 shadow-sm"
                        >
                            Train Another Word
                        </button>
                    </div>
                )}

                {/* Visualizer - Only show if typing/training */}
                <div className="w-full mt-4 opacity-50 hover:opacity-100 transition-opacity">
                    <Keyboard />
                </div>

            </div>
        </main>
    );
}
