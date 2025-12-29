"use client";

import { useGesture } from "@/components/gesture-context";
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <Card className="w-80 h-[calc(100vh-8rem)] overflow-y-auto border-l rounded-none border-y-0 border-r-0 bg-background/50 backdrop-blur-sm shadow-none">
            <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Engine State</CardTitle>
                    <div className={`w-2 h-2 rounded-full ${mode === 'TYPING' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4">

                {/* STATUS CARD */}
                <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Mode:</span>
                        <Badge variant="outline" className="font-mono text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400">{mode}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Calibrated:</span>
                        <Badge variant={isCalibrated ? "default" : "secondary"} className={isCalibrated ? "bg-green-600 hover:bg-green-700" : ""}>
                            {isCalibrated ? "YES" : "NO"}
                        </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Keys:</span>
                        <span className="font-mono font-bold">{activeKeys.size}</span>
                    </div>
                </div>

                {/* LIVE TRAJECTORY */}
                <div className="flex flex-col gap-2">
                    <h3 className="font-bold text-xs text-muted-foreground flex justify-between items-center">
                        Latest Trajectory
                        <Badge variant="secondary" className="text-[10px] h-5">
                            {rawPath.length} pts
                        </Badge>
                    </h3>
                    <div className="bg-zinc-950 text-green-400 p-3 rounded-lg font-mono text-[10px] overflow-hidden min-h-[60px] flex flex-col justify-end border border-zinc-800 shadow-inner">
                        {activeKeys.size > 0 && (
                            <div className="animate-pulse">Recording...</div>
                        )}
                        {lastSequence && (
                            <div className="break-all">
                                <span className="text-zinc-500">raw: </span>
                                {lastSequence}
                            </div>
                        )}
                        {anchors.length > 0 && (
                            <div>
                                <span className="text-zinc-500">anchors: </span>
                                <span className="text-yellow-400">{anchors.join('-')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* PREDICTIONS */}
                <div className="flex flex-col gap-2 flex-grow">
                    <h3 className="font-bold text-xs text-muted-foreground">Predictions Stack</h3>
                    <div className="flex flex-col gap-2">
                        <AnimatePresence mode='popLayout'>
                            {predictions.map((word, i) => (
                                <motion.div
                                    key={word + i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className={`p-2 rounded-md border text-sm flex justify-between items-center shadow-sm ${i === 0 ? 'bg-primary/10 border-primary/20 text-primary font-bold' : 'bg-card border-border text-card-foreground'}`}>
                                        <span>{word}</span>
                                        <span className="text-[10px] opacity-50">#{i + 1}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {predictions.length === 0 && (
                            <div className="text-muted-foreground italic text-xs text-center py-4 border border-dashed rounded-md">Waiting for input...</div>
                        )}
                    </div>
                </div>

                {/* GHOST PATH */}
                <div className="mt-auto pt-4 border-t">
                    <h3 className="font-bold text-xs text-muted-foreground mb-2">Ghost Suggestion</h3>
                    <div className={`p-3 rounded-lg border transition-colors duration-300 ${ghostWord ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-muted/50 border-border'}`}>
                        {ghostWord ? (
                            <div className="flex justify-between items-center">
                                <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">{ghostWord}</span>
                                <Badge variant="outline" className="text-[10px] border-cyan-200 text-cyan-500 bg-background">TAB</Badge>
                            </div>
                        ) : (
                            <span className="text-muted-foreground italic text-xs">None</span>
                        )}
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
