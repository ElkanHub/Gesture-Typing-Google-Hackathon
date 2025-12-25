"use client";

import { useEffect, useState } from "react";
import { useGesture } from "@/components/gesture-context";
import { InteractiveCanvas } from "@/components/draw/interactive-canvas";
import { Keyboard } from "@/components/ui/keyboard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DrawPage() {
    const { setMode, shapes, clearCanvas } = useGesture();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedArt, setGeneratedArt] = useState<string | null>(null);

    useEffect(() => {
        setMode('DRAWING');
        return () => setMode('TYPING');
    }, [setMode]);

    const handleGenerate = async () => {
        if (shapes.length === 0) return;

        setIsGenerating(true);
        try {
            const res = await fetch('/api/compose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shapes })
            });
            const data = await res.json();
            if (data.svg) {
                setGeneratedArt(data.svg);
            }
        } catch (e) {
            console.error("Failed to generate art", e);
        } finally {
            setIsGenerating(false);
        }
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
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <span className="animate-spin text-white">●</span> Generating...
                            </>
                        ) : (
                            "Generate Art (Gemini)"
                        )}
                    </button>
                </div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Canvas Area */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold opacity-80">Your Sketch</h2>
                    <InteractiveCanvas />
                </div>

                {/* Result Area */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-semibold opacity-80">Gemini's Masterpiece</h2>
                    <div className="w-full h-[600px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-inner flex items-center justify-center overflow-hidden p-4">
                        {generatedArt ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: generatedArt }}
                                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
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
