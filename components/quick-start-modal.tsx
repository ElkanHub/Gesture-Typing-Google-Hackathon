"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, MapPin, Zap, Keyboard, Settings, MousePointer2 } from 'lucide-react';

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
                                    <div className="space-y-8">

                                        {/* 1. Get Started */}
                                        <section>
                                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-blue-500" />
                                                1. Get Started (Calibration)
                                            </h3>
                                            <p className="text-gray-600 mb-3 white">
                                                The app needs to know your keyboard layout.
                                                Press the highlighted <strong>Validation Keys</strong> in order on the virtual keyboard to calibrate your physical device. You will see <p className='text-green-500 whitespace-nowrap'>YES</p> on the right dashboard.
                                            </p>
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                                                <strong>Tip:</strong> This ensures your gestures are mapped correctly to your screen.
                                            </div>
                                        </section>

                                        <div className="w-full h-px bg-gray-100" />

                                        {/* 2. Key Features */}
                                        <section>
                                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                2. Key Features
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="bg-gray-50 p-4 rounded-xl">
                                                    <h4 className="font-bold text-gray-800 mb-1">Gesture Typing</h4>
                                                    <p className="text-sm text-gray-600">
                                                        Physically glide your fingers over keys to type. The AI predicts words based on your path.
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-xl">
                                                    <h4 className="font-bold text-gray-800 mb-1">Drawing Mode</h4>
                                                    <p className="text-sm text-gray-600">
                                                        Use your physical keyboard as a canvas. AI interprets your keystrokes into shapes and art.
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        <div className="w-full h-px bg-gray-100" />

                                        {/* 3. The Two Pages */}
                                        <section>
                                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <MousePointer2 className="w-5 h-5 text-purple-500" />
                                                3. Using the App
                                            </h3>
                                            <ul className="space-y-4">
                                                <li className="flex gap-4">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">A</div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">Typing Interface (Home)</h4>
                                                        <p className="text-sm text-gray-600">
                                                            The main page for text validation and typing practice. Use the virtual keyboard reference to learn the positions.
                                                        </p>
                                                    </div>
                                                </li>
                                                <li className="flex gap-4">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-bold">B</div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">Draw with Keyboard</h4>
                                                        <p className="text-sm text-gray-600">
                                                            Switch to this mode to create generative art. Your gestures become brush strokes, interpretable by AI.
                                                        </p>
                                                    </div>
                                                </li>
                                            </ul>
                                        </section>

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
