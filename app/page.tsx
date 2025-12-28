import { TypingArea } from "@/components/ui/typing-area";
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
    <main className="flex min-h-screen flex-col items-center p-4 lg:p-8 bg-gray-50 dark:bg-[#050505] selection:bg-blue-500 selection:text-white relative overflow-x-hidden">

      {/* Background decoration */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      </div>

      {/* App Documentation Viewer */}
      <AppDocModal content={docContent} />

      {/* Modern Glass Header */}
      <header className="z-50 w-full max-w-7xl flex items-center justify-between px-6 py-4 rounded-2xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-xl shadow-sm mb-8 sticky top-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <span className="text-white dark:text-black font-bold text-lg">⌨️</span>
          </div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
            Headless Gesture Engine
          </p>
        </div>

        <div className="flex items-center gap-4">
          <QuickStartModal />

          <Link href="/draw" className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
            <div className="relative flex items-center px-4 py-2 bg-white dark:bg-black rounded-lg leading-none cursor-pointer">
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 group-hover:from-pink-500 group-hover:to-purple-500 transition-all">
                Draw Mode
              </span>
              <span className="ml-2 text-base group-hover:translate-x-0.5 transition-transform">🎨</span>
            </div>
          </Link>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl z-10">

        {/* Left Column: Typing Interface */}
        <div className="flex-grow flex flex-col gap-6">
          <TypingArea />
          <div className="flex flex-col gap-4">
            <Keyboard />
          </div>
        </div>

        {/* Right Column: Insight Panel */}
        <div className="hidden lg:block shrink-0">
          <div className="sticky top-28">
            <InsightPanel />
          </div>
        </div>

      </div>

      {/* Guide Overlay for Calibration - Made more subtle */}
      <div className="fixed bottom-6 right-6 z-40 opacity-50 hover:opacity-100 transition-opacity">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-gray-200 dark:border-zinc-800 rounded-full px-4 py-2 text-xs font-medium text-gray-500 shadow-sm">
          Tip: Press 'Validation Keys' to calibrate map
        </div>
      </div>
    </main>
  );
}
