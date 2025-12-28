"use client";

import { useEffect, useState, useRef } from "react";
import { useGesture } from "@/components/gesture-context";
import { InteractiveCanvas } from "@/components/draw/interactive-canvas";
import { Keyboard } from "@/components/ui/keyboard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DrawPage() {
    const { setMode, shapes, clearCanvas } = useGesture();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedArt, setGeneratedArt] = useState<string | null>(null);
    const [thought, setThought] = useState<string | null>(null);
    const [isThoughtOpen, setIsThoughtOpen] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<string>("");
    const [userPrompt, setUserPrompt] = useState("");

    useEffect(() => {
        setMode('DRAWING');
    }, [setMode]);

    const handleGenerate = async () => {
        if (shapes.length === 0 || !canvasRef.current) return;

        setIsGenerating(true);
        setStatus("Capturing sketch...");
        try {
            // Capture Canvas
            const html2canvas = (await import('html2canvas-pro')).default;
            const canvas = await html2canvas(canvasRef.current, {
                backgroundColor: '#ffffff',
                scale: 1,
            });
            const initImage = canvas.toDataURL('image/webp', 0.8);

            setStatus("Dreaming up scene...");
            // Generate SVG from API
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: initImage,
                    userPrompt: userPrompt.trim()
                })
            });

            if (!res.ok) throw new Error("Generation failed");

            const data = await res.json();
            if (data.image && data.image.startsWith('data:image/svg+xml')) {
                setStatus("Rendering masterpiece...");
                // Convert SVG to PNG immediately
                const img = new Image();
                img.src = data.image;
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });

                const renderCanvas = document.createElement('canvas');
                // High resolution render
                const scale = 2;
                renderCanvas.width = 1200 * scale;
                renderCanvas.height = 800 * scale;

                const ctx = renderCanvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
                    ctx.drawImage(img, 0, 0, renderCanvas.width, renderCanvas.height);

                    const pngUrl = renderCanvas.toDataURL('image/png');
                    setGeneratedArt(pngUrl);
                } else {
                    // Fallback to SVG if canvas fails
                    setGeneratedArt(data.image);
                }
                if (data.thought) setThought(data.thought);
            } else if (data.image) {
                setGeneratedArt(data.image);
                if (data.thought) setThought(data.thought);
            }
        } catch (e) {
            console.error("Failed to generate art", e);
            alert("Failed to generate art. Please try again.");
        } finally {
            setIsGenerating(false);
            setStatus("");
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

            {/* Consistent Glass Header */}
            <header className="z-50 w-full max-w-7xl flex items-center justify-between px-6 py-4 rounded-2xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-xl shadow-sm mb-8 sticky top-4 mt-4 mx-4">
                <Link href="/" className="flex items-center gap-2 group text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Keyboard</span>
                </Link>
                <div className="flex items-center gap-4">
                    <button
                        onClick={clearCanvas}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                        Clear Canvas
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
                                    <span className="animate-spin">●</span> {status || "Processing..."}
                                </>
                            ) : (
                                <>
                                    <span>Generate Masterpiece</span>
                                    <span className="text-lg">✨</span>
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </header>

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 z-10">
                {/* Canvas Area */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold opacity-80 flex items-center gap-2">
                            <span>✏️</span> Your Sketch
                        </h2>
                    </div>
                    <div className="p-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <InteractiveCanvas ref={canvasRef} />
                    </div>

                    <div className="space-y-2 bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800/50">
                        <label htmlFor="userPrompt" className="text-sm font-medium opacity-70 block mb-2">
                            Add a hint for the AI (Optional)
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

                {/* Result Area */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between h-[32px]">
                        <h2 className="text-xl font-semibold opacity-80 flex items-center gap-2">
                            <span>🖼️</span> The Masterpiece
                        </h2>
                        {generatedArt && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                                {thought && (
                                    <button
                                        onClick={() => setIsThoughtOpen(true)}
                                        className="text-xs font-medium px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1.5"
                                    >
                                        <span>🧠</span> Thoughts
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDownload('gemini-masterpiece.png')}
                                    className="text-xs font-medium px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5"
                                >
                                    <span>⬇️</span> Download
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-[600px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden p-4 relative group">
                        {generatedArt ? (
                            <img
                                src={generatedArt}
                                alt="Generated Art"
                                className="w-full h-full object-contain animate-in zoom-in-95 duration-500"
                            />
                        ) : (
                            <div className="text-center text-gray-400 opacity-40 group-hover:opacity-60 transition-opacity">
                                <div className="text-6xl mb-4 grayscale">🎨</div>
                                <p className="font-medium">Canvas Awaiting Imagination</p>
                                <p className="text-xs mt-2 max-w-[200px] mx-auto leading-relaxed">Draw basic shapes on the left, add a hint, and watch Gemini 3 & Imagen 4 bring it to life.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Thought Modal */}
            {isThoughtOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setIsThoughtOpen(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"></div>

                    {/* Content */}
                    <div className="bg-white dark:bg-zinc-900 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 border border-white/10" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsThoughtOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                            ✕
                        </button>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                            <span className="text-2xl">🧠</span>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">Gemini's Vision</span>
                        </h3>
                        <div className="prose dark:prose-invert max-h-[60vh] overflow-y-auto text-sm leading-relaxed text-gray-600 dark:text-gray-300 pr-2 custom-scrollbar">
                            {thought}
                        </div>
                    </div>
                </div>
            )}

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
