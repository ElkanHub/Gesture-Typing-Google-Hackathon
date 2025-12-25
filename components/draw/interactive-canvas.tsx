import React, { useRef, useState, useEffect } from 'react';
import Draggable, { DraggableEventHandler } from 'react-draggable';
import { useGesture } from '@/components/gesture-context';
import { Shape } from '@/lib/types';
import { Trash2, RotateCw, Maximize2, Wand2, Download, X } from 'lucide-react';

interface DraggableShapeProps {
    shape: Shape;
    scale: number;
    isSelected: boolean;
    onSelect: () => void;
    onChange: (updates: Partial<Shape>) => void;
    onDelete: () => void;
}

function DraggableShape({ shape, scale, isSelected, onSelect, onChange, onDelete }: DraggableShapeProps) {
    const nodeRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Denormalize coordinates
    const left = shape.x * scale;
    const top = shape.y * scale;
    // Enforce minimums to ensure visibility (especially for lines)
    const width = Math.max(20, shape.width * scale);
    const height = Math.max(20, shape.height * scale);
    const rotation = shape.rotation || 0;

    // Interaction State
    const [interaction, setInteraction] = useState<'none' | 'rotating' | 'resizing-xy' | 'resizing-x' | 'resizing-y'>('none');
    const startPosRef = useRef({ x: 0, y: 0, w: 0, h: 0, r: 0 });

    const handleDragStart: DraggableEventHandler = (e) => {
        onSelect();
        setIsDragging(true);
    };

    const handleDragStop: DraggableEventHandler = (e, data) => {
        setIsDragging(false);
        // Normalize back to 0-1
        onChange({
            x: data.x / scale,
            y: data.y / scale
        });
    };

    // --- Rotation Logic ---
    const startRotate = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setInteraction('rotating');
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosRef.current = { x: clientX, y: clientY, w: 0, h: 0, r: rotation };
    };

    // --- Resize Logic ---
    const startResize = (mode: 'xy' | 'x' | 'y') => (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setInteraction(mode === 'xy' ? 'resizing-xy' : mode === 'x' ? 'resizing-x' : 'resizing-y');
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosRef.current = { x: clientX, y: clientY, w: width, h: height, r: 0 };
    };

    // Global Events for Interaction
    useEffect(() => {
        if (interaction === 'none') return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            if (interaction === 'rotating') {
                if (nodeRef.current) {
                    const rect = nodeRef.current.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;

                    const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
                    let angleDeg = angleRad * (180 / Math.PI);
                    angleDeg += 90;

                    onChange({ rotation: angleDeg });
                }
            } else if (interaction.startsWith('resizing')) {
                const dx = clientX - startPosRef.current.x;
                const dy = clientY - startPosRef.current.y;

                let newWidth = startPosRef.current.w;
                let newHeight = startPosRef.current.h;

                if (interaction.includes('x') || interaction.includes('xy')) {
                    newWidth = Math.max(20, startPosRef.current.w + dx);
                }
                if (interaction.includes('y') || interaction.includes('xy')) {
                    newHeight = Math.max(20, startPosRef.current.h + dy);
                }

                onChange({
                    width: newWidth / scale,
                    height: newHeight / scale
                });
            }
        };

        const handleUp = () => {
            setInteraction('none');
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [interaction, scale, onChange]);


    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: left, y: top }}
            onStart={handleDragStart}
            onStop={handleDragStop}
            bounds="parent"
            disabled={interaction !== 'none'} // Disable dragging when rotating/resizing
        >
            <div
                ref={nodeRef}
                className={`absolute cursor-move group ${isSelected ? 'z-50' : 'z-10'}`}
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                style={{
                    width: width,
                    height: height,
                    // transform: `rotate(${rotation}deg)`,
                    // transformOrigin: 'center center'
                    // position handled by Draggable
                }}
            >
                {/* Rotatable Container */}
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: 'center center'
                    }}
                >
                    {/* Visual Border */}
                    <div className={`w-full h-full relative ${isSelected ? 'border-2 border-blue-500' : 'hover:border-2 hover:border-gray-300'}`}>

                        {/* Shape Rendering */}
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible block">
                            <g transform={`rotate(${0} 50 50)`}> {/* Inner rotation if needed */}
                                {shape.type === 'circle' && (
                                    <ellipse cx="50" cy="50" rx="48" ry="48" fill="none" stroke="currentColor" strokeWidth="4" className={isSelected ? "text-blue-500 fill-blue-500/10" : "text-black dark:text-white fill-transparent"} />
                                )}
                                {shape.type === 'square' && (
                                    <rect x="2" y="2" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="4" className={isSelected ? "text-blue-500 fill-blue-500/10" : "text-black dark:text-white fill-transparent"} />
                                )}
                                {shape.type === 'triangle' && (
                                    <polygon points="50,2 98,98 2,98" fill="none" stroke="currentColor" strokeWidth="4" className={isSelected ? "text-blue-500 fill-blue-500/10" : "text-black dark:text-white fill-transparent"} />
                                )}
                                {shape.type === 'line' && (
                                    <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="6" className={isSelected ? "text-blue-500" : "text-black dark:text-white"} />
                                )}
                            </g>
                        </svg>

                        {/* Controls (Only visible when selected) */}
                        {isSelected && (
                            <>
                                {/* Rotate Handle */}
                                <div
                                    onMouseDown={startRotate}
                                    onTouchStart={startRotate}
                                    className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full shadow cursor-grab flex items-center justify-center hover:bg-blue-50"
                                >
                                    <RotateCw size={12} className="text-gray-600" />
                                </div>

                                {/* Resize Handle (Corner: Both) */}
                                <div
                                    onMouseDown={startResize('xy')}
                                    onTouchStart={startResize('xy')}
                                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border border-gray-300 rounded-full shadow cursor-nwse-resize flex items-center justify-center hover:bg-blue-50"
                                >
                                    <Maximize2 size={12} className="text-gray-600 rotate-90" />
                                </div>

                                {/* Resize Handle (Right: Width) */}
                                <div
                                    onMouseDown={startResize('x')}
                                    onTouchStart={startResize('x')}
                                    className="absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-8 bg-white border border-gray-300 rounded shadow cursor-ew-resize flex items-center justify-center hover:bg-blue-50"
                                >
                                    <div className="w-0.5 h-4 bg-gray-300"></div>
                                </div>

                                {/* Resize Handle (Bottom: Height) */}
                                <div
                                    onMouseDown={startResize('y')}
                                    onTouchStart={startResize('y')}
                                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-white border border-gray-300 rounded shadow cursor-ns-resize flex items-center justify-center hover:bg-blue-50"
                                >
                                    <div className="h-0.5 w-4 bg-gray-300"></div>
                                </div>

                                {/* Delete Button (Top-Right) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    className="absolute -top-3 -right-3 w-6 h-6 bg-white border border-red-200 rounded-full shadow cursor-pointer flex items-center justify-center hover:bg-red-50 text-red-500"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Draggable>
    );
}



export function InteractiveCanvas() {
    const { shapes, addShape, updateShape, removeShape, clearCanvas } = useGesture();
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Scale factor for visibility
    const scale = 500;

    // Delete handler
    const deleteShape = (id: string) => {
        removeShape(id);
        if (selectedId === id) setSelectedId(null);
    };

    const handleGenerate = async () => {
        if (!containerRef.current) return;
        setIsGenerating(true);
        setSelectedId(null); // Deselect before capture

        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(containerRef.current, {
                backgroundColor: '#ffffff', // Force white background for cleaner input
                scale: 1, // Standard resolution is fine for sketch input
            });

            // Optimize input: WebP 0.8 quality
            const initImage = canvas.toDataURL('image/webp', 0.8);

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: initImage })
            });

            if (!response.ok) throw new Error('Generation failed');

            const data = await response.json();
            if (data.image) {
                setGeneratedImage(data.image);
            }
        } catch (error) {
            console.error("Generation error:", error);
            alert("Failed to generate image. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div
            ref={containerRef}
            onClick={() => setSelectedId(null)} // Deselect on background click
            className="relative w-full h-[600px] bg-white dark:bg-zinc-900 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl overflow-hidden shadow-inner"
        >
            {/* Canvas Controls */}
            <div className="absolute top-4 left-4 flex gap-2 z-50">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || shapes.length === 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                >
                    {isGenerating ? (
                        <span className="animate-spin">⏳</span>
                    ) : (
                        <Wand2 size={14} className="text-purple-500" />
                    )}
                    Generate
                </button>
                {generatedImage && (
                    <button
                        onClick={() => handleDownload(generatedImage, 'generated-art.webp')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 text-xs font-medium transition-colors"
                    >
                        <Download size={14} className="text-blue-500" />
                        Download Art
                    </button>
                )}
                <button
                    onClick={() => {
                        if (containerRef.current) {
                            import('html2canvas').then(html2canvas => {
                                html2canvas.default(containerRef.current!, { backgroundColor: null }).then(canvas => {
                                    handleDownload(canvas.toDataURL('image/webp'), 'my-sketch.webp');
                                });
                            });
                        }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 text-xs font-medium transition-colors"
                >
                    <Download size={14} className="text-gray-500" />
                    Save Sketch
                </button>
            </div>

            {/* Generated Image Overlay */}
            {generatedImage && (
                <div className="absolute inset-0 z-40 bg-white/5 dark:bg-black/5 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden border-4 border-white dark:border-zinc-800">
                        {/* Close Button */}
                        <button
                            onClick={() => setGeneratedImage(null)}
                            className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
                        >
                            <X size={16} />
                        </button>
                        <img src={generatedImage} alt="Generated Art" className="max-h-[500px] object-contain" />
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 text-gray-400 text-sm font-mono pointer-events-none select-none text-right z-0">
                <p>Interactive Canvas Active</p>
                <p className="text-xs opacity-50">Shapes: {shapes.length}</p>
            </div>

            {shapes.map(shape => (
                <DraggableShape
                    key={shape.id}
                    shape={shape}
                    scale={scale}
                    isSelected={selectedId === shape.id}
                    onSelect={() => setSelectedId(shape.id)}
                    onChange={(updates) => updateShape(shape.id, updates)}
                    onDelete={() => deleteShape(shape.id)}
                />
            ))}

            {shapes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                    <div className="text-center">
                        <p className="text-xl">Draw on your keyboard</p>
                        <p className="text-sm opacity-60">Triangles, Squares, Circles, Lines</p>
                    </div>
                </div>
            )}
        </div>
    );
}
