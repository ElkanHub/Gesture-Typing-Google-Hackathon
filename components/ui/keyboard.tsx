"use client";

import { useGesture } from "@/components/gesture-context";
import { Point } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';

export function Keyboard() {
  const {
    mode,
    keyMap,
    validationTarget,
    activeKeys,
    trajectory,
    ghostTrajectory,
    calibrationStatus, // Access status
    registerKeyPosition,
    predictions,
    selectPrediction
  } = useGesture();

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setContainerRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  const keys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  // Map trajectory to SVG path data (relative to client?)
  // Trajectory points are X/Y client coordinates from rect.left/rect.top
  // SVG is absolute overlay.
  // We need to ensure the SVG coordinate system matches.
  // If we assume SVG fills the viewport, then client X/Y works directly.
  // If SVG is inside `relative` container, we need to subtract container left/top.

  const getPathD = (points: Point[]) => {
    if (points.length < 2 || !containerRect) return "";

    const offsetX = containerRect.left;
    const offsetY = containerRect.top;

    return points.reduce((acc, p, i) => {
      // Adjust coordinates to be relative to the container
      const x = p.x - offsetX;
      const y = p.y - offsetY;
      return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
    }, "");
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-5xl mx-auto border rounded-xl p-4 bg-gray-50 shadow-lg select-none">

      {/* Suggestion Bar (Integrated) */}
      {mode === 'TYPING' && (
        <div className="absolute -top-16 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-sm flex items-center px-4 gap-2 overflow-x-auto z-40 transition-all transform animate-in fade-in slide-in-from-bottom-2">
          {predictions.length === 0 ? (
            <span className="text-gray-400 text-xs ml-2 italic">Start sliding to type...</span>
          ) : (
            predictions.map((word, index) => (
              <button
                key={index}
                onClick={() => selectPrediction(word)}
                className={`
                            px-4 py-1.5 rounded-full text-sm font-medium transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap shadow-sm
                            ${index === 0
                    ? 'bg-blue-600 text-white shadow-blue-200'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}
                        `}
              >
                {word}
              </button>
            ))
          )}
        </div>
      )}

      {/* Visual Trajectory Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
        {/* Ghost Path (Bottom Layer) */}
        {containerRect && ghostTrajectory && ghostTrajectory.length > 1 && (
          <path
            d={getPathD(ghostTrajectory)}
            fill="none"
            stroke="#00E5FF" // Cyan / Neon Blue
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.4"
            className="drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] transition-all duration-300 ease-in-out"
          />
        )}

        {/* Active Path (Top Layer) */}
        {containerRect && trajectory.length > 1 && (
          <path
            d={getPathD(trajectory)}
            fill="none"
            stroke="#FF4500" // Red-Orange
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.7"
          />
        )}
      </svg>

      <div className="flex flex-col gap-2 relative z-10 pt-4">
        {keys.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((char) => {
              const isActive = activeKeys.has(char);
              const isTarget = validationTarget === char;
              const isMapped = !!keyMap[char];

              return (
                <Key
                  key={char}
                  char={char}
                  isActive={isActive}
                  isTarget={isTarget}
                  isMapped={isMapped}
                  onRegister={(rect) => registerKeyPosition(char, rect)}
                />
              );
            })}
          </div>
        ))}
        {/* Spacebar Row */}
        <div className="flex justify-center mt-2">
          <div className={`
                h-12 w-64 rounded-lg flex items-center justify-center border font-bold bg-white shadow-sm transition-all duration-100
                ${activeKeys.has(' ') ? 'bg-blue-100 scale-95 border-blue-400' : 'border-gray-200'}
            `}>
            Space
          </div>
        </div>
      </div>

      {/* Legend / Status */}
      <div className="mt-4 text-xs text-center text-gray-400">
        Status: {mode} ({activeKeys.size} keys active)
        {ghostTrajectory && ghostTrajectory.length > 0 && <span className="text-cyan-500 ml-2 font-bold animate-pulse"> • Ghost Guide Active (Press Tab)</span>}
      </div>

      {/* Calibration Success Overlay */}
      <AnimatePresence>
        {calibrationStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex flex-col items-center border border-green-400"
          >
            <div className="text-2xl mb-2">✅</div>
            <div className="font-bold text-lg">{calibrationStatus}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Key({ char, isActive, isTarget, isMapped, onRegister }: {
  char: string,
  isActive: boolean,
  isTarget: boolean,
  isMapped: boolean,
  onRegister: (rect: DOMRect) => void
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Register position only once or on resize (simplification: just once for now)
  useEffect(() => {
    if (ref.current) {
      onRegister(ref.current.getBoundingClientRect());
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`
                w-12 h-12 rounded-lg flex items-center justify-center uppercase font-bold text-lg border transition-all duration-75 relative
                ${isActive ? 'bg-blue-500 text-white scale-95 shadow-inner' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'}
                ${isTarget ? 'ring-4 ring-green-400 ring-opacity-50 animate-pulse bg-green-50 border-green-400' : 'border-gray-200'}
                ${!isMapped && !isTarget ? 'opacity-80' : ''}
            `}
    >
      {char}
      {/* Debug Dot */}
      {isMapped && <div className="absolute top-1 right-1 w-1 h-1 bg-green-300 rounded-full" />}
    </div>
  );
}
