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
    const canvasRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<string>("");

    useEffect(() => {
        setMode('DRAWING');
        return () => setMode('TYPING');
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
                body: JSON.stringify({ image: initImage })
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
            } else if (data.image) {
                setGeneratedArt(data.image);
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
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 p-8 flex flex-col items-center">

            <div className="w-full max-w-6xl flex justify-between items-center mb-8">
                <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                    Back to Typing
                </Link>
                <div className="flex gap-4">
                    <button
                        onClick={clearCanvas}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Clear Canvas
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || shapes.length === 0}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[180px] justify-center"
                    >
                        {isGenerating ? (
                            <>
                                <span className="animate-spin text-white">●</span> {status || "Processing..."}
                            </>
                        ) : (
                            "Generate Masterpiece"
                        )}
                    </button>
                </div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Canvas Area */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold opacity-80">Your Sketch</h2>
                    <InteractiveCanvas ref={canvasRef} />
                </div>

                {/* Result Area */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold opacity-80">Gemini's Result</h2>
                        {generatedArt && (
                            <button
                                onClick={() => handleDownload('gemini-masterpiece.png')}
                                className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                Download Image
                            </button>
                        )}
                    </div>

                    <div className="w-full h-[600px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-inner flex items-center justify-center overflow-hidden p-4 relative">
                        {generatedArt ? (
                            <img
                                src={generatedArt}
                                alt="Generated Art"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="text-center text-gray-400 opacity-60">
                                <p className="mb-2 text-4xl">🎨</p>
                                <p>Artificial Intelligence is waiting...</p>
                                <p className="text-sm">Draw some shapes and click Generate</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Keyboard Control Deck */}
            <div className="w-full max-w-3xl mx-auto opacity-80 hover:opacity-100 transition-opacity mt-12">
                <Keyboard />
                <p className="text-center text-xs text-gray-400 mt-2">
                    Keyboard is in DRAWING mode. Gestures are mapped to shapes.
                </p>
            </div>
        </div>
    );
}
