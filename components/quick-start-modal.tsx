"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, MapPin, Zap, Keyboard, Settings, MousePointer2, Sparkles, Brain } from 'lucide-react';

export function QuickStartModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center gap-2"
            >
                <HelpCircle size={18} />
                <span className="whitespace-nowrap">Quick Start Guide</span>
            </button>

            {/* Modal Overlay - Portalled to body to escape parent stacking contexts */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            />

                            {/* Modal Panel */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <Zap className="text-blue-600" />
                                        <h2 className="text-xl font-bold text-gray-800">Quick Start Guide</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-8 overflow-y-auto">
                                    <div className="space-y-6">

                                        {/* Step 1: Calibration */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    <Keyboard size={20} />
                                                </div>
                                                <h3 className="font-semibold text-gray-800">1. Calibrate (Essential)</h3>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed pl-12">
                                                When prompted, press the requested key <strong>ONE time</strong> on your physical keyboard. The engine instantly detects your layout (QWERTY, AZERTY, etc.) and aligns the sensors.
                                            </p>
                                        </div>

                                        {/* Step 2: Typing */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                    <MousePointer2 size={20} />
                                                </div>
                                                <h3 className="font-semibold text-gray-800">2. Headless Typing</h3>
                                            </div>
                                            <ul className="text-sm text-gray-600 leading-relaxed pl-12 list-disc list-outside space-y-1">
                                                <li><strong>Tap</strong> keys normally for single letters.</li>
                                                <li><strong>Swipe</strong> across keys to form words. Imagine drawing the shape of the word.</li>
                                                <li>Watch the <strong>Suggestion Bar</strong>: Green is a local match, Amber is AI prediction.</li>
                                            </ul>
                                        </div>

                                        {/* Step 3: Creative Agent */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                                    <Sparkles size={20} />
                                                </div>
                                                <h3 className="font-semibold text-gray-800">3. Creative Studio (/draw)</h3>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed pl-12">
                                                Use your keyboard to sketch shapes. The <strong>Agentic AI</strong> will:
                                            </p>
                                            <ul className="text-sm text-gray-600 leading-relaxed pl-12 list-disc list-outside mt-1 space-y-1">
                                                <li><strong>Plan & Generate</strong> a masterpiece from your sketch.</li>
                                                <li><strong>Contextualize</strong> it by generating usable Code (for UI) or Captions (for Art).</li>
                                                <li><strong>Refine</strong> the result based on your feedback.</li>
                                            </ul>
                                        </div>

                                        {/* Step 4: Training */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                                    <Brain size={20} />
                                                </div>
                                                <h3 className="font-semibold text-gray-800">4. Pattern Training (/train)</h3>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed pl-12">
                                                Teach the engine your unique swipe style for specific words using <strong>3-Shot Learning</strong>. This creates a personalized shortcut that bypasses the AI for instant speed.
                                            </p>
                                        </div>

                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
