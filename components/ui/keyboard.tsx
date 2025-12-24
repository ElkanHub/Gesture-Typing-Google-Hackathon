"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGesture } from '@/components/gesture-context';

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

export function Keyboard() {
  const {
    validationTarget,
    activeKeys,
    registerKeyPosition,
    trajectory,
    mode
  } = useGesture();

  const keyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Check for validation press
  useEffect(() => {
    if (validationTarget && activeKeys.has(validationTarget)) {
      const el = keyRefs.current[validationTarget];
      if (el) {
        const rect = el.getBoundingClientRect();
        registerKeyPosition(validationTarget, rect);
      }
    }
  }, [activeKeys, validationTarget, registerKeyPosition]);

  return (
    <div className="relative w-full max-w-4xl mx-auto p-4 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-lg select-none">
      <div className="flex flex-col gap-2 relative z-10">
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((char) => {
              const isActive = activeKeys.has(char);
              const isTarget = validationTarget === char;

              return (
                <div
                  key={char}
                  ref={(el) => { keyRefs.current[char] = el; }}
                  className={`
                    w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg font-bold uppercase transition-all duration-75
                    ${isActive
                      ? 'bg-blue-500 text-white scale-95 shadow-inner'
                      : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm border-b-2 border-gray-300 dark:border-gray-900'}
                    ${isTarget ? 'ring-4 ring-yellow-400 animate-pulse bg-yellow-100 dark:bg-yellow-900' : ''}
                  `}
                >
                  {char}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Spacebar Row (Visual only, disabled) */}
      <div className="flex justify-center mt-2 opacity-50">
        <div className="w-1/2 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
      </div>

      {/* Gesture Path Overlay - Full Screen Fixed to map correctly to screen coords */}
      {/* Note: We map keys by screen coords, so our SVG points should match. */}
      <GoalOverlay trajectory={trajectory} />
    </div>
  );
}

function GoalOverlay({ trajectory }: { trajectory: any[] }) {
  if (trajectory.length < 2) return null;

  // Convert trajectory points to path string
  // Points are absolute screen coordinates {x, y}
  // We need to render them in a fixed overlay

  // We'll create a coordinate string: "M x1 y1 L x2 y2 ..."
  const d = trajectory.reduce((acc, point, i) => {
    return acc + `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y} `;
  }, '');

  return (
    <svg className="fixed inset-0 pointer-events-none z-50 w-full h-full">
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(59, 130, 246, 0.6)" // Blue with opacity
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.1 }}
      />
      {/* Draw dots at vertices for debug effect */}
      {trajectory.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="red" />
      ))}
    </svg>
  );
}
