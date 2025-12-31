import React, { useEffect, useState } from 'react';

function App() {
    const [status, setStatus] = useState('Ready');
    const [content, setContent] = useState<string | null>(null);
    const [mode, setMode] = useState<'AGENT' | 'TYPING'>('AGENT');

    useEffect(() => {
        // Listen for messages from Background Script
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'AGENT_RESPONSE') {
                console.log("UI Received:", message);
                setStatus('Finished');
                setContent(message.text);
            }
            if (message.type === 'AGENT_STATUS') {
                setStatus(message.status);
            }
            if (message.type === 'MODE_CHANGED') {
                setMode(message.mode);
            }
        });
    }, []);

    return (
        <div className="p-4 w-full h-screen bg-neutral-900 text-white overflow-y-auto">
            <h1 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Agent Stream
            </h1>

            <div className="mb-4 text-sm font-mono text-neutral-400 border-b border-neutral-700 pb-2 flex justify-between items-center">
                <span>Status: <span className="text-emerald-400">{status}</span></span>
                <span className={`px-2 py-0.5 rounded text-xs border ${mode === 'AGENT' ? 'border-purple-500 text-purple-400' : 'border-blue-500 text-blue-400'}`}>
                    {mode === 'AGENT' ? '🟢 Agent' : '⌨️ Typing'}
                </span>
            </div>

            {mode === 'TYPING' && !content && (
                <div className="mb-4 p-2 bg-blue-900/30 border border-blue-500/30 rounded text-xs text-blue-300">
                    Input Focused. Gesture Typing Enabled.
                </div>
            )}

            {content && (
                <div className="prose prose-invert prose-sm">
                    <p className="whitespace-pre-wrap leading-relaxed text-neutral-200">
                        {content}
                    </p>
                </div>
            )}

            {!content && mode === 'AGENT' && (
                <div className="text-center mt-10 text-neutral-600 italic">
                    Waiting for gesture...
                    <br />
                    <span className="text-xs">Swipe L-R to Summarize</span>
                </div>
            )}
        </div>
    )
}

export default App
