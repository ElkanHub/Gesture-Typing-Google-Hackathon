import { TypingArea } from "@/components/ui/typing-area";
import { PredictionBar } from "@/components/ui/prediction-bar";
import { Keyboard } from "@/components/ui/keyboard";

import { AppDocModal } from "@/components/app-doc-modal";
import { InsightPanel } from "@/components/ui/insight-panel";
import fs from 'fs';
import path from 'path';
import Link from "next/link";

import { QuickStartModal } from "@/components/quick-start-modal";

async function getDocContent() {
  try {
    const filePath = path.join(process.cwd(), 'APPDOC.md');
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content;
  } catch (e) {
    return "# Documentation Not Found\n\nPlease check if APPDOC.md exists.";
  }
}

export default async function Home() {
  const docContent = await getDocContent();

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">

      {/* App Documentation Viewer */}
      <AppDocModal content={docContent} />

      {/* Header */}
      <div className="z-10 w-full max-w-7xl items-center justify-between font-mono text-sm lg:flex border-b border-gray-300 bg-white pb-6 pt-8 backdrop-blur-2xl lg:static lg:rounded-xl lg:border lg:bg-white lg:p-4 shadow-sm mb-8">
        <p className="flex w-full justify-center lg:justify-start font-bold text-gray-700">
          Headless Gesture Typing Prototype
        </p>

        {/* Quick Start Modal (Button included) */}
        <div className="w-full lg:w-auto px-4 my-4 lg:my-0">
          <QuickStartModal />
        </div>

        <div className="flex w-full justify-center lg:justify-end font-bold text-gray-700">
          <Link href="/draw" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            <button>
              Draw with your Keyboard
            </button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl">

        {/* Left Column: Typing Interface */}
        <div className="flex-grow flex flex-col gap-6">
          <TypingArea />
          <div className="flex flex-col gap-4">
            <PredictionBar />
            <Keyboard />
          </div>
        </div>

        {/* Right Column: Insight Panel */}
        <div className="hidden lg:block shrink-0">
          <div className="sticky top-8">
            <InsightPanel />
          </div>
        </div>

      </div>

      {/* Guide Overlay for Calibration */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-400 max-w-xs text-right">
        Tip: Press 'Validation Keys' in order to calibrate your physical keyboard map.
      </div>
    </main>
  );
}
