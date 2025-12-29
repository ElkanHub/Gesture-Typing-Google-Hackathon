"use client";

import React, { useEffect, useRef } from 'react';
import { useGesture } from '@/components/gesture-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/magicui/border-beam";

export function TypingArea() {
    const { committedText, clearText, predictedCompletion, setMode } = useGesture();
    const endRef = useRef<HTMLDivElement>(null);

    // Enforce TYPING mode on this page
    useEffect(() => {
        setMode('TYPING');
    }, [setMode]);

    return (
        <Card className="w-full relative overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                    Typing Area
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearText}
                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    Clear
                </Button>
            </CardHeader>
            <CardContent>
                <div
                    className="w-full bg-background/50 p-2 text-2xl font-mono focus:outline-none min-h-[150px] rounded-md overflow-y-auto max-h-[300px] whitespace-pre-wrap break-words"
                >
                    {/* Border Beam Effect */}
                    <BorderBeam size={100} duration={8} delay={9} />

                    {committedText || <span className="text-muted-foreground/50 italic">Gesture typing output will appear here...</span>}
                    {predictedCompletion && (
                        <span className="text-muted-foreground/60 opacity-60 bg-clip-text animate-pulse">
                            {predictedCompletion} <span className="text-xs align-super bg-secondary text-secondary-foreground rounded px-1 border border-border not-italic">TAB</span>
                        </span>
                    )}
                    <div ref={endRef} />
                </div>
            </CardContent>
        </Card>
    );
}
