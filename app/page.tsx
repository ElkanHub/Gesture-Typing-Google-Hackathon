import { TypingArea } from "@/components/ui/typing-area";
import { Keyboard } from "@/components/ui/keyboard";

import { AppDocModal } from "@/components/app-doc-modal";
import { InsightPanel } from "@/components/ui/insight-panel";
import fs from 'fs';
import path from 'path';
import Link from "next/link";

import { QuickStartModal } from "@/components/quick-start-modal";
import { ModeToggle } from "@/components/mode-toggle";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <main className="flex min-h-screen flex-col items-center p-4 lg:p-8 bg-background relative overflow-x-hidden">

      {/* Magic UI Background */}
      <div className="z-0 pointer-events-none absolute inset-0 flex items-center justify-center bg-gray [mask-image:linear-gradient(to_top,transparent_9%,black)] dark:bg-black"></div>
      <DotPattern
        className={cn(
          "opacity-50 text-gray-300 dark:text-gray-800"
        )}
      />

      {/* App Documentation Viewer */}
      <AppDocModal content={docContent} />

      {/* Modern Glass Header */}
      <header className="z-50 w-full max-w-7xl flex items-center justify-between px-6 py-4 rounded-2xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-xl shadow-sm mb-8 sticky top-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-xl">⌨️</span>
          </div>
          <div>
            <div className="font-bold text-white text-lg tracking-tight flex items-center">
              Gesture Typing
              <Badge variant="secondary" className="ml-2 text-xs">Prototype</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Desktop-first physical gesture experiment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ModeToggle />
          <QuickStartModal />

          <Link href="/draw" className="group relative">
            <Button variant="outline" className="border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-950/20 text-foreground group relative overflow-hidden">
              <span className="relative z-10 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent font-bold group-hover:from-pink-500 group-hover:to-purple-500 transition-all">
                Draw Mode
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
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

      {/* Guide Overlay for Calibration */}
      <div className="fixed bottom-6 right-6 z-40">
        <Badge variant="outline" className="bg-background/80 backdrop-blur text-muted-foreground">
          Tip: Press 'Validation Keys' to calibrate map
        </Badge>
      </div>
    </main>
  );
}
