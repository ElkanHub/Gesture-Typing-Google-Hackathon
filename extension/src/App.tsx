import { useEffect, useState, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
type Message = {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: number;
    actions?: string[];
};

// --- Components ---

function IconBot({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
        </svg>
    )
}

function IconUser({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function IconCopy({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
    )
}

function IconTrash({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    )
}

function IconCheck({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}

// --- Main App ---

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [mode, setMode] = useState<'AGENT' | 'TYPING'>('AGENT');
    const [copiedId, setCopiedId] = useState<string | null>(null);
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

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="flex flex-col h-screen bg-black/50 font-sans selection:bg-indigo-100 overflow-hidden">
            {/* Background Gradient Mesh */}
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-200/50 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-200/50 blur-[100px]" />
            </div>

            {/* Header */}
            <header className="flex-none px-5 py-4 border-b border-indigo-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between shadow-sm/50">
                <div className="flex items-center gap-3">
                    {/* <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                        <div className="relative w-9 h-9 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-1 ring-black/5">
                            GT
                        </div>
                    </div> */}
                    <div>
                        <h1 className="font-bold text-base tracking-tight leading-none text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Gesture Typing</h1>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Prototype </p>
                    </div>
                </div>

                <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all duration-300 transform scale-95 hover:scale-100 backdrop-blur-md",
                    mode === 'AGENT'
                        ? "bg-emerald-50/80 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20"
                        : "bg-blue-50/80 text-blue-700 border-blue-200 ring-1 ring-blue-500/20"
                )}>
                    {mode === 'AGENT' ? 'Agent Active' : 'Typing Mode'}
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth z-10">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-700 slide-in-from-bottom-4">
                        <div className="relative mb-8 group cursor-default">
                            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-700 animate-pulse"></div>
                            <div className="relative w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-5xl shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-50 border-t border-white">
                                <span className="bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">✨</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Hello, Friend!</h3>
                        <p className="text-sm text-slate-500 max-w-[260px] leading-relaxed">
                            I'm ready to help. Switch to <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">Agent Mode</span> and swipe right to summarize or create.
                        </p>

                        <div className="mt-8 flex gap-3 text-xs font-medium text-slate-400">
                            <div className="px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">➡️ Summarize</div>
                            <div className="px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">⬆️ Explain</div>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col group relative animate-in slide-in-from-bottom-2 fade-in duration-500",
                                msg.role === 'user' ? "items-end" : "items-start"
                            )}
                        >
                            {/* Role Label */}
                            <div className={cn(
                                "flex items-center gap-1.5 mb-1.5 px-1 opacity-60 transition-opacity group-hover:opacity-100",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}>
                                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                                </span>
                            </div>

                            {/* Message Bubble container */}
                            <div className="relative max-w-[90%] flex drop-shadow-sm">
                                {/* Message Content */}
                                <div className={cn(
                                    " rounded px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm border transition-transform duration-200",
                                    msg.role === 'user'
                                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent rounded-tr-sm shadow-indigo-200"
                                        : "bg-white border-slate-100 text-slate-700 rounded-tl-sm w-full shadow-slate-200/50"
                                )}>
                                    {msg.content === 'Thinking...' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-indigo-500 font-medium animate-pulse">Thinking</span>
                                            <div className="flex gap-1">
                                                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
                                            </div>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>

                                {/* Sticky Copy Button (Agent Only) */}
                                {msg.role === 'agent' && msg.content !== 'Thinking...' && (
                                    <button
                                        onClick={() => copyToClipboard(msg.content, msg.id)}
                                        className={cn(
                                            "sticky top-2 h-8 w-8 ml-2 mt-0 flex-shrink-0 flex items-center justify-center rounded-full border shadow-sm transition-all duration-300",
                                            copiedId === msg.id
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-600 scale-100 opacity-100"
                                                : "bg-white border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:scale-110 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        )}
                                        title="Copy Response"
                                    >
                                        {copiedId === msg.id ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} className="h-4" />
            </main>

            {/* Footer */}
            <footer className="flex-none p-4 border-t border-slate-100 bg-white/80 backdrop-blur-md z-50">
                <button
                    onClick={clearHistory}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-all active:scale-[0.98] group bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-red-100"
                >
                    <IconTrash className="w-3.5 h-3.5 transition-colors group-hover:text-red-500" />
                    Clear Conversation History
                </button>
            </footer>
        </div>
    );
}

export default App;
