"use client";

import { useGesture } from "@/components/gesture-context";
import { motion, AnimatePresence } from 'framer-motion';

export function InsightPanel() {
    const {
        mode,
        isCalibrated,
        activeKeys,
        predictions,
        ghostWord,
        committedText,
        debugState
    } = useGesture();

    const { lastSequence, anchors, rawPath } = debugState;

    return (
        <div className="w-80 flex flex-col gap-4 p-4 border-l border-gray-200 bg-white/50 backdrop-blur-sm h-[calc(100vh-8rem)] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h2 className="font-bold text-gray-700 uppercase tracking-wider">Engine State</h2>
                <div className={`w-2 h-2 rounded-full ${mode === 'TYPING' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            </div>

            {/* STATUS CARD */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-1">
                <div className="flex justify-between">
                    <span className="text-gray-500">Mode:</span>
                    <span className="font-bold text-blue-600">{mode}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Calibrated:</span>
                    <span className={isCalibrated ? "text-green-600" : "text-yellow-600"}>
                        {isCalibrated ? "YES" : "NO"}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Active Keys:</span>
                    <span className="font-bold text-gray-800">{activeKeys.size}</span>
                </div>
            </div>

            {/* LIVE TRAJECTORY */}
            <div className="flex flex-col gap-2">
                <h3 className="font-bold text-gray-600 flex justify-between items-center">
                    Latest Trajectory
                    <span className="text-[10px] bg-gray-200 px-1 rounded text-gray-500">
                        {rawPath.length} pts
                    </span>
                </h3>
                <div className="bg-zinc-900 text-green-400 p-3 rounded-lg font-mono text-[10px] overflow-hidden min-h-[60px] flex flex-col justify-end">
                    {activeKeys.size > 0 && (
                        <div className="animate-pulse">Recording...</div>
                    )}
                    {lastSequence && (
                        <div className="break-all">
                            <span className="text-gray-500">raw: </span>
                            {lastSequence}
                        </div>
                    )}
                    {anchors.length > 0 && (
                        <div>
                            <span className="text-gray-500">anchors: </span>
                            <span className="text-yellow-400">{anchors.join('-')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* PREDICTIONS */}
            <div className="flex flex-col gap-2 flex-grow">
                <h3 className="font-bold text-gray-600">Predictions Stack</h3>
                <div className="flex flex-col gap-1">
                    <AnimatePresence mode='popLayout'>
                        {predictions.map((word, i) => (
                            <motion.div
                                key={word + i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className={`p-2 rounded border flex justify-between items-center ${i === 0 ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold' : 'bg-white border-gray-100 text-gray-600'}`}
                            >
                                <span>{word}</span>
                                <span className="text-[10px] opacity-50">#{i + 1}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {predictions.length === 0 && (
                        <div className="text-gray-400 italic text-center py-4">Waiting for input...</div>
                    )}
                </div>
            </div>

            {/* GHOST PATH */}
            <div className="mt-auto">
                <h3 className="font-bold text-gray-600 mb-1">Ghost Suggestion</h3>
                <div className={`p-3 rounded-lg border transition-colors duration-300 ${ghostWord ? 'bg-cyan-50 border-cyan-200' : 'bg-gray-50 border-gray-100'}`}>
                    {ghostWord ? (
                        <div className="flex justify-between items-center">
                            <span className="text-cyan-700 font-bold text-lg">{ghostWord}</span>
                            <span className="text-[10px] text-cyan-500 border border-cyan-200 px-1 rounded bg-white">TAB</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 italic">None</span>
                    )}
                </div>
            </div>

        </div>
    );
}
