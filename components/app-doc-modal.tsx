"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X } from 'lucide-react';

interface AppDocModalProps {
    content: string;
}

export function AppDocModal({ content }: AppDocModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Trigger Button */}
            <motion.button
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                onClick={() => setIsOpen(true)}
                className="fixed left-6 bottom-6 z-40 flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 shadow-xl rounded-full hover:bg-gray-50 hover:scale-105 transition-all group"
            >
                <div className="bg-blue-600 text-white p-2 rounded-full">
                    <BookOpen size={20} />
                </div>
                <span className="font-medium text-gray-700 pr-2 group-hover:text-blue-600">
                    Read App Docs
                </span>
            </motion.button>

            {/* Modal Overlay */}
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
                            className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="text-blue-600" />
                                    <h2 className="text-xl font-bold text-gray-800">Application Documentation</h2>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8 overflow-y-auto overflow-x-hidden">
                                <article className="text-black prose prose-blue max-w-none prose-headings:font-bold prose-headings:text-black prose-p:text-black prose-li:text-black">
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                </article>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
