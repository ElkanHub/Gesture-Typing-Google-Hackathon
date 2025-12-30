"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, ChevronLeft, ChevronRight, Volume2, Square, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppDocModalProps {
    docs: { title: string; content: string }[];
}

function stripMarkdown(markdown: string): string {
    if (!markdown) return "";
    return markdown
        // Remove headers
        .replace(/^#+\s+/gm, '')
        // Remove bold/italic
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Remove links
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        // Remove images
        .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
        // Remove blockquotes
        .replace(/^\s*>\s+/gm, '')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`([^`]+)`/g, '$1')
        // Remove list markers
        .replace(/^[\s-]*\*\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        // Remove extra newlines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function AppDocModal({ docs }: AppDocModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    const currentDoc = docs[pageIndex];
    const hasNext = pageIndex < docs.length - 1;
    const hasPrev = pageIndex > 0;

    // Stop speech when modal closes or page changes
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        };
    }, [isOpen, pageIndex]);

    const handleSpeak = () => {
        if (!currentDoc) return;

        window.speechSynthesis.cancel(); // Stop any previous

        const cleanText = stripMarkdown(currentDoc.content);
        // Add title for context
        const fullText = `${currentDoc.title}. ${cleanText}`;

        const utterance = new SpeechSynthesisUtterance(fullText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
    };

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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 shrink-0">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="text-blue-600" />
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">
                                            {currentDoc?.title || "Documentation"}
                                        </h2>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                            Chapter {pageIndex + 1} of {docs.length}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={isPlaying ? handleStop : handleSpeak}
                                        className={`gap-2 ${isPlaying ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : ''}`}
                                    >
                                        {isPlaying ? (
                                            <>
                                                <Square size={16} className="fill-current" /> Stop
                                            </>
                                        ) : (
                                            <>
                                                <Volume2 size={16} /> Listen
                                            </>
                                        )}
                                    </Button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 overflow-y-auto overflow-x-hidden flex-grow bg-white">
                                {currentDoc ? (
                                    <article className="text-black prose prose-blue max-w-none prose-headings:font-bold prose-headings:text-black prose-p:text-black prose-li:text-black">
                                        <ReactMarkdown>{currentDoc.content}</ReactMarkdown>
                                    </article>
                                ) : (
                                    <div className="text-center text-gray-500 py-10">
                                        No documentation found.
                                    </div>
                                )}
                            </div>

                            {/* Footer Navigation */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                                    disabled={!hasPrev}
                                    className="gap-2"
                                >
                                    <ChevronLeft size={16} /> Previous Chapter
                                </Button>

                                <div className="flex gap-1">
                                    {docs.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full transition-all ${i === pageIndex ? 'bg-blue-600 w-4' : 'bg-gray-300'}`}
                                        />
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => setPageIndex(p => Math.min(docs.length - 1, p + 1))}
                                    disabled={!hasNext}
                                    className="gap-2"
                                >
                                    Next Chapter <ChevronRight size={16} />
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
