import { useEffect, useState, useRef } from 'react';

type Message = {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: number;
    actions?: string[];
};

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [mode, setMode] = useState<'AGENT' | 'TYPING'>('AGENT');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom on new message
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // 1. Load Initial History
        chrome.storage.session.get(['chatHistory'], (result) => {
            if (result.chatHistory) {
                setMessages(result.chatHistory as Message[]);
            }
        });

        // 2. Listen for Updates
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'CHAT_UPDATE') {
                setMessages(message.messages);
            }
            if (message.type === 'MODE_CHANGED') {
                setMode(message.mode);
            }
        });
    }, []);

    const clearHistory = () => {
        setMessages([]);
        chrome.storage.session.remove('chatHistory');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    return (
        <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
            {/* Header */}
            <header className="flex-none p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                        GT
                    </div>
                    <div>
                        <h1 className="font-bold text-sm tracking-tight leading-none">Gesture Typing</h1>
                        <p className="text-[10px] text-zinc-500 font-medium">Extension</p>
                    </div>
                </div>

                <div className={`
                    px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                    ${mode === 'AGENT'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'}
                `}>
                    {mode === 'AGENT' ? 'Agent Mode' : 'Typing Mode'}
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl mb-4 flex items-center justify-center text-2xl">
                            👋
                        </div>
                        <p className="text-sm font-medium">Ready for gestures</p>
                        <p className="text-xs max-w-[200px] mt-2">
                            Swipe in "Agent Mode" to trigger actions. Responses will appear here.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group relative`}>
                            {/* Role Label */}
                            <span className="text-[10px] text-zinc-400 mb-1 px-1">
                                {msg.role === 'user' ? 'You' : 'Agent'}
                            </span>

                            {/* Message Bubble container */}
                            <div className="relative max-w-[90%] flex">
                                {/* Message Content */}
                                <div className={`
                                    rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm border
                                    ${msg.role === 'user'
                                        ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-tr-none'
                                        : 'bg-indigo-50 dark:bg-slate-900 border-indigo-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none w-full'}
                                `}>
                                    {msg.content}
                                </div>

                                {/* Sticky Copy Button (Agent Only) */}
                                {msg.role === 'agent' && (
                                    <button
                                        onClick={() => copyToClipboard(msg.content)}
                                        className="sticky top-2 h-8 w-8 ml-2 mt-0 flex-shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:scale-110 active:scale-95 transition-all text-zinc-500 hover:text-blue-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Copy Response"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </main>

            {/* Footer */}
            <footer className="flex-none p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 backdrop-blur-sm">
                <button
                    onClick={clearHistory}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Clear History
                </button>
            </footer>
        </div>
    );
}

export default App;
