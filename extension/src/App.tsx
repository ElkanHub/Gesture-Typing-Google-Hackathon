import React, { useEffect, useState } from 'react';

function App() {
    const [status, setStatus] = useState('Ready');
    const [content, setContent] = useState<string | null>(null);

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
        });
    }, []);

    return (
        <div className="p-4 w-full h-screen bg-neutral-900 text-white overflow-y-auto">
            <h1 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Agent Stream
            </h1>

            <div className="mb-4 text-sm font-mono text-neutral-400 border-b border-neutral-700 pb-2">
                Status: <span className="text-emerald-400">{status}</span>
            </div>

            {content && (
                <div className="prose prose-invert prose-sm">
                    <p className="whitespace-pre-wrap leading-relaxed text-neutral-200">
                        {content}
                    </p>
                </div>
            )}

            {!content && (
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
