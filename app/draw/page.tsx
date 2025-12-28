"use client";

import { useEffect, useState, useRef } from "react";
import { useGesture } from "@/components/gesture-context";
import { InteractiveCanvas } from "@/components/draw/interactive-canvas";
import { Keyboard } from "@/components/ui/keyboard";
import Link from "next/link";
import { ArrowLeft, Sparkles, Brain, CheckCircle, AlertCircle } from "lucide-react";

export default function DrawPage() {
    const { setMode, shapes, clearCanvas } = useGesture();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedArt, setGeneratedArt] = useState<string | null>(null);
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

    const handleGenerate = async () => {
        if (shapes.length === 0 || !canvasRef.current) return;

        setIsGenerating(true);
        setGeneratedArt(null);
        setThoughts([]);
        setCurrentStatus("Initializing Agent...");

        try {
            // Capture Canvas
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
                    userPrompt: userPrompt.trim()
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
                            setGeneratedArt(data.content);
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
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 flex flex-col items-center relative overflow-x-hidden">

            {/* Background decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            </div>

            {/* Header */}
            <header className="z-50 w-full max-w-7xl flex items-center justify-between px-6 py-4 rounded-2xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-xl shadow-sm mb-6 sticky top-4 mt-4 mx-4">
                <Link href="/" className="flex items-center gap-2 group text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back</span>
                </Link>
                <div className="flex items-center gap-4">
                    <button
                        onClick={clearCanvas}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || shapes.length === 0}
                        className="group relative px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
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
                    </button>
                </div>
            </header>

            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 z-10">

                {/* LEFT: Canvas (5 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="p-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <InteractiveCanvas ref={canvasRef} />
                    </div>
                    <div className="space-y-2 bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800/50">
                        <label htmlFor="userPrompt" className="text-sm font-medium opacity-70 block mb-2">
                            Agent Hint (Context)
                        </label>
                        <input
                            id="userPrompt"
                            type="text"
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="e.g. A cyberpunk street in rain..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* MIDDLE: Agent Brain (3 cols) */}
                <div className="lg:col-span-3 flex flex-col h-[600px] bg-white dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2 bg-gray-50/50 dark:bg-zinc-950/30">
                        <Brain size={18} className="text-purple-500" />
                        <h3 className="font-semibold text-sm">Agent "Thought" Stream</h3>
                    </div>
                    <div ref={thoughtsHelperRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scrollbar">
                        {thoughts.length === 0 && !isGenerating && (
                            <div className="text-center text-gray-400 mt-20">
                                <p>Waiting for input...</p>
                            </div>
                        )}
                        {thoughts.map((item, idx) => (
                            <div key={idx} className={`flex gap-3 animate-in slide-in-from-left-2 fade-in duration-300`}>
                                <div className="mt-0.5 shrink-0">
                                    {item.type === 'status' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                    {item.type === 'thought' && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                                    {item.type === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                </div>
                                <div>
                                    <p className={`leading-relaxed ${item.type === 'status' ? 'text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[10px]' :
                                            item.type === 'error' ? 'text-red-500' :
                                                'text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {item.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex gap-2 items-center text-gray-400 animate-pulse text-xs ml-5">
                                <span>...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Result (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="w-full h-[600px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden p-4 relative group">
                        {generatedArt ? (
                            <div className="relative w-full h-full">
                                <img
                                    src={generatedArt}
                                    alt="Generated Art"
                                    className="w-full h-full object-contain animate-in zoom-in-95 duration-500"
                                />
                                <div className="absolute bottom-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => handleDownload('gemini-masterpiece.png')}
                                        className="text-xs font-bold px-4 py-2 bg-white/90 text-black rounded-full hover:bg-white shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <span>⬇️</span> Download
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 opacity-40">
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
                <p className="text-center text-xs text-gray-400 mt-2 font-mono">
                    MODE: DRAWING // Mapped
                </p>
            </div>
        </div>
    );
}
