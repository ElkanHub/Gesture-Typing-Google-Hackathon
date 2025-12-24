"use client";

import { TypingArea } from "@/components/ui/typing-area";
import { PredictionBar } from "@/components/ui/prediction-bar";
import { Keyboard } from "@/components/ui/keyboard";
import { GestureProvider, useGesture } from "@/components/gesture-context";

function AppContent() {
  const { isCalibrated, validationTarget } = useGesture();

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-4 bg-gray-50 dark:bg-black font-[family-name:var(--font-geist-sans)]">

      {!isCalibrated && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-white pointer-events-none">
          <h2 className="text-3xl font-bold mb-4">Calibration Required</h2>
          <p className="text-xl mb-8">Please press the highlighted key on your physical keyboard.</p>
          <div className="text-6xl font-mono p-8 border-4 border-yellow-400 rounded-xl bg-gray-900 animate-bounce">
            {validationTarget?.toUpperCase()}
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl flex flex-col flex-1 gap-4 z-10">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-xl font-bold">GestureTyper <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded ml-2">Prototype</span></h1>
          <div className="flex gap-2">
            <div className={`w-3 h-3 rounded-full ${isCalibrated ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">{isCalibrated ? 'Ready' : 'Calibrating'}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <TypingArea />
        </div>

        <div className="flex flex-col gap-2 mt-4 sticky bottom-4">
          <PredictionBar />
          <Keyboard />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <GestureProvider>
      <AppContent />
    </GestureProvider>
  );
}
