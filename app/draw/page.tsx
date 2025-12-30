"use client";

import { useEffect, useState, useRef } from "react";
import { useGesture } from "@/components/gesture-context";
import { InteractiveCanvas } from "@/components/draw/interactive-canvas";
import { Keyboard } from "@/components/ui/keyboard";
import Link from "next/link";
import { ArrowLeft, Sparkles, Brain, CheckCircle, ChevronLeft, ChevronRight, Download, Code, MessageSquare, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

interface HistoryItem {
    id: string;
    image: string;
    context?: {
        type: 'code' | 'text';
        content: string;
    };
}

export default function DrawPage() {
    const { setMode, shapes, clearCanvas } = useGesture();
    const [isGenerating, setIsGenerating] = useState(false);

    // Image History State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [currIndex, setCurrIndex] = useState(0);

    const currentItem = history.length > 0 ? history[currIndex] : null;
    const generatedArt = currentItem?.image || null;

    const [thoughts, setThoughts] = useState<Array<{ type: 'status' | 'thought' | 'error', content: string }>>([]);
    const [currentStatus, setCurrentStatus] = useState<string>("");
    const canvasRef = useRef<HTMLDivElement>(null);
    const [userPrompt, setUserPrompt] = useState("");

    useEffect(() => {
        setMode('DRAWING');
    }, [setMode]);

    // Scroll thoughts to bottom
    const thoughtsHelperRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (thoughtsHelperRef.current) {
            thoughtsHelperRef.current.scrollTop = thoughtsHelperRef.current.scrollHeight;
        }
    }, [thoughts]);

    const handleGenerate = async (isRefine = false) => {
        if (shapes.length === 0 || !canvasRef.current) return;

        setIsGenerating(true);

        setThoughts([]);
        setCurrentStatus(isRefine ? "Refining Agent..." : "Initializing Agent...");

        try {
            // ... capture canvas ...
            const html2canvas = (await import('html2canvas-pro')).default;
            const canvas = await html2canvas(canvasRef.current, {
                backgroundColor: '#ffffff',
                scale: 1,
            });
            const initImage = canvas.toDataURL('image/webp', 0.8);

            // Stream Request
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: initImage,
                    userPrompt: userPrompt.trim(),
                    previousImage: isRefine ? generatedArt : undefined
                })
            });

            if (!response.body) throw new Error("No stream body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);

                        if (data.type === "status") {
                            setCurrentStatus(data.content);
                            setThoughts(prev => [...prev, { type: 'status', content: data.content }]);
                        } else if (data.type === "thought") {
                            setThoughts(prev => [...prev, { type: 'thought', content: data.content }]);
                        } else if (data.type === "image") {
                            // Add new image to history
                            setHistory(prev => {
                                const newItem: HistoryItem = {
                                    id: Date.now().toString(),
                                    image: data.content
                                };
                                const newHistory = [...prev, newItem];
                                setCurrIndex(newHistory.length - 1);
                                return newHistory;
                            });
                            setCurrentStatus("Contextualizing...");
                        } else if (data.type === "context") {
                            // Attach context to the latest history item
                            const contextData = JSON.parse(data.content);
                            setHistory(prev => {
                                const newHistory = [...prev];
                                const lastIdx = newHistory.length - 1;
                                if (lastIdx >= 0) {
                                    newHistory[lastIdx] = {
                                        ...newHistory[lastIdx],
                                        context: contextData
                                    };
                                }
                                return newHistory;
                            });
                            setCurrentStatus("Complete");
                        } else if (data.type === "error") {
                            setThoughts(prev => [...prev, { type: 'error', content: data.content }]);
                            setCurrentStatus("Error");
                        }
                    } catch (e) {
                        console.error("Parse Error", e);
                    }
                }
            }
        } catch (e: any) {
            console.error("Failed to generate", e);
            setThoughts(prev => [...prev, { type: 'error', content: "Connection failed" }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = (filename: string) => {
        if (!generatedArt) return;
        const link = document.createElement('a');
        link.href = generatedArt;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col items-center relative overflow-x-hidden">

            {/* Background decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            </div>

            {/* Header */}
            <header className="z-50 w-full max-w-7xl flex items-center justify-between px-6 py-4 rounded-2xl border border-border/50 bg-background/70 backdrop-blur-xl shadow-sm mb-6 sticky top-4 mt-4 mx-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 group text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <ModeToggle />
                    {generatedArt ? (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    clearCanvas();
                                    setHistory([]);
                                    setCurrIndex(0);
                                    setThoughts([]);
                                    setCurrentStatus("");
                                    setUserPrompt("");
                                }}
                                className="gap-2"
                            >
                                <Sparkles size={16} />
                                New Artwork
                            </Button>
                            <Button
                                onClick={() => handleGenerate(true)}
                                disabled={isGenerating}
                                className="group relative font-bold text-white shadow-lg transition-all overflow-hidden border-none"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:scale-105 transition-transform"></div>
                                <div className="relative flex items-center gap-2">
                                    {isGenerating ? (
                                        <>
                                            <span className="animate-spin">●</span> {currentStatus || "Refining..."}
                                        </>
                                    ) : (
                                        <>
                                            <span>Refine</span>
                                            <CheckCircle size={16} />
                                        </>
                                    )}
                                </div>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="destructive"
                                onClick={clearCanvas}
                                size="sm"
                                className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 border-transparent"
                            >
                                Clear
                            </Button>
                            <Button
                                onClick={() => handleGenerate(false)}
                                disabled={isGenerating || shapes.length === 0}
                                className="group relative font-bold text-white shadow-lg transition-all overflow-hidden border-none"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:scale-105 transition-transform"></div>
                                <div className="relative flex items-center gap-2">
                                    {isGenerating ? (
                                        <>
                                            <span className="animate-spin">●</span> {currentStatus || "Thinking..."}
                                        </>
                                    ) : (
                                        <>
                                            <span>Activate Creative Agent</span>
                                            <Sparkles size={16} />
                                        </>
                                    )}
                                </div>
                            </Button>
                        </>
                    )}
                </div>
            </header>

            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 z-10">

                {/* LEFT: Canvas (5 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="p-1 bg-card rounded-2xl shadow-sm border border-border">
                        <InteractiveCanvas ref={canvasRef} />
                    </div>
                    <div className="space-y-2 bg-card p-4 rounded-xl border border-border">
                        <label htmlFor="userPrompt" className="text-sm font-medium opacity-70 block mb-2">
                            Agent Hint (Context)
                        </label>
                        <input
                            id="userPrompt"
                            type="text"
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="e.g. A cyberpunk street in rain..."
                            className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                        />
                    </div>
                </div>

                {/* MIDDLE: Agent Brain (3 cols) */}
                <div className="lg:col-span-3 flex flex-col h-[600px] bg-card/80 backdrop-blur-md rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/30">
                        <Brain size={18} className="text-primary" />
                        <h3 className="font-semibold text-sm">Agent "Thought" Stream</h3>
                    </div>
                    <div ref={thoughtsHelperRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scrollbar">
                        {thoughts.length === 0 && !isGenerating && (
                            <div className="text-center text-muted-foreground mt-20">
                                <p>Waiting for input...</p>
                            </div>
                        )}
                        {thoughts.map((item, idx) => (
                            <div key={idx} className={`flex gap-3 animate-in slide-in-from-left-2 fade-in duration-300`}>
                                <div className="mt-0.5 shrink-0">
                                    {item.type === 'status' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                    {item.type === 'thought' && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                                    {item.type === 'error' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                                </div>
                                <div>
                                    <p className={`leading-relaxed ${item.type === 'status' ? 'text-muted-foreground font-semibold uppercase tracking-wider text-[10px]' :
                                        item.type === 'error' ? 'text-destructive' :
                                            'text-foreground'
                                        }`}>
                                        {item.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex gap-2 items-center text-muted-foreground animate-pulse text-xs ml-5">
                                <span>...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Result (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="w-full h-[600px] bg-card border border-border rounded-2xl shadow-inner flex items-center justify-center overflow-hidden p-4 relative group">
                        {generatedArt ? (
                            <div className="relative w-full h-full group">
                                <img
                                    src={generatedArt}
                                    alt="Generated Art"
                                    className="w-full h-full object-contain animate-in zoom-in-95 duration-500"
                                />

                                {/* Carousel Controls */}
                                {history.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setCurrIndex(prev => Math.max(0, prev - 1))}
                                            disabled={currIndex === 0}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0 disabled:pointer-events-none transition-all"
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button
                                            onClick={() => setCurrIndex(prev => Math.min(history.length - 1, prev + 1))}
                                            disabled={currIndex === history.length - 1}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0 disabled:pointer-events-none transition-all"
                                        >
                                            <ChevronRight size={24} />
                                        </button>

                                        {/* Version Badge */}
                                        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-md">
                                            Version {currIndex + 1} / {history.length}
                                        </div>
                                    </>
                                )}

                                {/* Contextual Content (Agent's Note) */}
                                {currentItem?.context && (
                                    <div className="absolute inset-x-4 bottom-16 z-20 animate-in slide-in-from-bottom-5 duration-700 delay-300">
                                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-border p-4 max-h-[200px] overflow-y-auto custom-scrollbar group/context transition-all hover:max-h-[400px]">
                                            <div className="flex items-center justify-between mb-2 sticky top-0 bg-inherit z-10 pb-2 border-b border-border/50">
                                                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                                                    {currentItem.context.type === 'code' ? <Code size={14} /> : <MessageSquare size={14} />}
                                                    {currentItem.context.type === 'code' ? 'Generated Code' : 'Agent Message'}
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 hover:bg-muted"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(currentItem.context?.content || "");
                                                        // toast("Copied to clipboard"); 
                                                    }}
                                                >
                                                    <Copy size={12} />
                                                </Button>
                                            </div>

                                            <div className="text-sm text-foreground/90">
                                                {currentItem.context.type === 'code' ? (
                                                    <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                                        {currentItem.context.content}
                                                    </pre>
                                                ) : (
                                                    <p className="italic leading-relaxed">
                                                        "{currentItem.context.content}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                                    <Button
                                        onClick={() => handleDownload(`gemini-artifact-${currIndex + 1}.png`)}
                                        className="text-xs font-bold px-4 py-2 bg-primary hover:bg-primary/80 shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <Download size={16} /> Download
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground opacity-40">
                                <div className="text-6xl mb-4 grayscale">🎨</div>
                                <p className="font-medium">Canvas Awaiting Agent</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Keyboard Control Deck */}
            <div className="w-full max-w-3xl mx-auto opacity-80 hover:opacity-100 transition-opacity mt-12 mb-8 z-10">
                <Keyboard />
                <p className="text-center text-xs text-muted-foreground mt-2 font-mono">
                    MODE: DRAWING // Mapped
                </p>
            </div>
        </div>
    );
}
