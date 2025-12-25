import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { useGesture } from '@/components/gesture-context';
import { Shape } from '@/lib/types';

function DraggableShape({ shape, scale }: { shape: Shape, scale: number }) {
    const nodeRef = useRef(null);

    // Denormalize coordinates
    const left = shape.x * scale;
    const top = shape.y * scale;
    const width = shape.width * scale;
    const height = shape.height * scale;

    return (
        <Draggable
            nodeRef={nodeRef}
            defaultPosition={{ x: left, y: top }}
            bounds="parent"
        >
            <div
                ref={nodeRef}
                className="absolute cursor-move group"
                style={{
                    width: Math.max(width, 20),
                    height: Math.max(height, 20),
                    // position is handled by Draggable via transform
                }}
            >
                {/* Shape Rendering */}
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                    {shape.type === 'circle' && (
                        <ellipse cx="50" cy="50" rx="48" ry="48" fill="none" stroke="black" strokeWidth="4" className="dark:stroke-white fill-blue-500/20" />
                    )}
                    {shape.type === 'square' && (
                        <rect x="2" y="2" width="96" height="96" fill="none" stroke="black" strokeWidth="4" className="dark:stroke-white fill-red-500/20" />
                    )}
                    {shape.type === 'triangle' && (
                        <polygon points="50,2 98,98 2,98" fill="none" stroke="black" strokeWidth="4" className="dark:stroke-white fill-green-500/20" />
                    )}
                    {shape.type === 'line' && (
                        <line x1="0" y1="50" x2="100" y2="50" stroke="black" strokeWidth="6" className="dark:stroke-white" />
                    )}
                </svg>

                {/* Dimensions Label (Hover) */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {shape.type}
                </div>
            </div>
        </Draggable>
    );
}

export function InteractiveCanvas() {
    const { shapes, addShape } = useGesture();
    const containerRef = useRef<HTMLDivElement>(null);

    // Scale factor for visibility
    const scale = 500;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[600px] bg-white dark:bg-zinc-900 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl overflow-hidden shadow-inner"
        >
            <div className="absolute top-4 right-4 text-gray-400 text-sm font-mono pointer-events-none select-none text-right">
                <p>Interactive Canvas Active</p>
                <p className="text-xs opacity-50">Shapes: {shapes.length}</p>
            </div>

            {shapes.map(shape => (
                <DraggableShape key={shape.id} shape={shape} scale={scale} />
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
