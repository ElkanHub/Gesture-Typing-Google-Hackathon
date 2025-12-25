"use client";

import React, { useEffect, useRef } from 'react';
import { useGesture } from '@/components/gesture-context';

export function TypingArea() {
    const { committedText, clearText, predictedCompletion } = useGesture();
    const endRef = useRef<HTMLDivElement>(null);

    // Auto-scroll removed per user request
    // useEffect(() => {
    //    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    // }, [committedText]);

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Typing Area</h2>
                <button onClick={clearText} className="text-xs text-red-400 hover:text-red-500">Clear</button>
            </div>

            <div
                className="w-full bg-white dark:bg-black p-6 text-2xl font-mono focus:outline-none min-h-[150px] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-y-auto max-h-[300px]"
            >
                {committedText || <span className="text-gray-400 italic">Gesture typing output will appear here...</span>}
                {predictedCompletion && (
                    <span className="text-gray-400 opacity-60 bg-clip-text animate-pulse">
                        {predictedCompletion} <span className="text-xs align-super bg-gray-100 dark:bg-zinc-800 rounded px-1 border border-gray-300 dark:border-zinc-700 not-italic">ENTER / TAB</span>
                    </span>
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
}
