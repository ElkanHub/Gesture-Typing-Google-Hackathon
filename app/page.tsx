import { TypingArea } from "@/components/ui/typing-area";
import { PredictionBar } from "@/components/ui/prediction-bar";
import { Keyboard } from "@/components/ui/keyboard";
import { GestureProvider } from "@/components/gesture-context";
import { AppDocModal } from "@/components/app-doc-modal";
import fs from 'fs';
import path from 'path';

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
    <main className="flex min-h-screen flex-col items-center justify-between p-12 bg-gray-100">

      {/* App Documentation Viewer */}
      <AppDocModal content={docContent} />

      <GestureProvider>
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
            Headless Gesture Typing Prototype
          </p>
        </div>

        <div className="w-full max-w-5xl mt-12 flex flex-col gap-6">
          <TypingArea />

          <div className="flex flex-col gap-4">
            <PredictionBar />
            <Keyboard />
          </div>
        </div>
      </GestureProvider>

      {/* Guide Overlay for Calibration */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-400 max-w-xs text-right">
        Tip: Press 'Validation Keys' in order to calibrate your physical keyboard map.
      </div>
    </main>
  );
}
