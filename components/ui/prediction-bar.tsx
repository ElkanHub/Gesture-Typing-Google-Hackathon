"use client";

import React from 'react';
import { useGesture } from '@/components/gesture-context';

export function PredictionBar() {
  const { predictions, selectPrediction } = useGesture();

  return (
    <div className="w-full h-14 bg-gray-50 dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 overflow-x-auto scrollbar-hide">
      {predictions.length === 0 && (
        <span className="text-gray-400 text-sm ml-2">Predictions appear here...</span>
      )}

      {predictions.map((word, index) => (
        <button
          key={index}
          onClick={() => selectPrediction(word)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
            ${index === 0
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}
          `}
        >
          {word}
        </button>
      ))}
    </div>
  );
}
