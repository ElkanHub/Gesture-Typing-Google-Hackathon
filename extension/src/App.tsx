import { useEffect, useState, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { playPCM, stopAudio } from "./lib/audio-utils";

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
    const [mode, setMode] = useState<'AGENT' | 'TYPING' | 'VOICE_CHAT'>('AGENT');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isVoiceConnected, setIsVoiceConnected] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState("Connecting...");
    const socketRef = useRef<WebSocket | null>(null);

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
            if (message.type === 'START_VOICE_CHAT') {
                setMode('VOICE_CHAT');
                startVoiceSession(message.plan);
            }
        });

        return () => {
            if (socketRef.current) socketRef.current.close();
        }
    }, []);

    const startVoiceSession = async (plan: string) => {
        setVoiceStatus("Fetching Key...");
        try {
            // Get Key
            const kRes = await fetch('http://localhost:3000/api/key');
            const kData = await kRes.json();
            const API_KEY = kData.key;

            if (!API_KEY) throw new Error("No API Key");

            setVoiceStatus("Connecting to Gemini Live...");

            // Connect
            // Prevent double connection (React Strict Mode fix)
            if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
                console.log("Socket already open, skipping init");
                return;
            }
            if (socketRef.current) {
                socketRef.current.close();
            }

            const url = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
            const socket = new WebSocket(`${url}?key=${API_KEY}`);
            socketRef.current = socket;

            socket.onopen = () => {
                setVoiceStatus("Connected. Speaking...");
                setIsVoiceConnected(true);

                // Setup
                socket.send(JSON.stringify({
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
                        generation_config: {
                            response_modalities: ["AUDIO", "TEXT"], // THE KEY: Request both modalities
                            speech_config: { voice_config: { prebuilt_voice_config: { voice_name: "Aoede" } } }
                        },
                        // Optional: Enable transcription of YOUR voice (User)
                        input_audio_transcription: {
                            enabled: true
                        },
                        system_instruction: { parts: [{ text: "You are the user's creative partner. Use the following synthesis to guide them. Talk to them about their open tabs. Keep responses concise." }] }
                    }
                }));

                // Initial Plan INJECTION
                socket.send(JSON.stringify({
                    client_content: {
                        turns: [{ role: "user", parts: [{ text: `Here is the plan from my Chief of Staff based on my open tabs: ${plan}` }] }],
                        turn_complete: true
                    }
                }));

                // Start Mic
                startMicrophone(socket);
            };

            socket.onerror = (error) => {
                console.error("Socket Error:", error);
                setVoiceStatus("Connection Error. Please retry.");
            };

            socket.onmessage = async (event) => {
                try {
                    let response;
                    if (event.data instanceof Blob) {
                        const text = await event.data.text();
                        response = JSON.parse(text);
                    } else {
                        response = JSON.parse(event.data);
                    }

                    // 1. Handle Gemini's Voice (Audio Chunks)
                    if (response.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                        const audioB64 = response.serverContent.modelTurn.parts[0].inlineData.data;
                        playPCM(audioB64);
                    }

                    // 2. Handle Gemini's Text (Real-time Transcript)
                    const liveText = response.serverContent?.modelTurn?.parts?.[0]?.text;
                    if (liveText) {
                        setMessages(prev => {
                            // Simple streaming logic: Append to last message if agent, else new message
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg && lastMsg.role === 'agent' && Date.now() - lastMsg.timestamp < 5000) {
                                return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + liveText }];
                            }
                            return [...prev, { id: `live-${Date.now()}`, role: 'agent', content: liveText, timestamp: Date.now() }];
                        });
                    }

                    // 3. Handle YOUR Voice (User Transcript)
                    if (response.serverContent?.inputTranscription) {
                        const myText = response.serverContent.inputTranscription.text;
                        // Optional: Show my own voice usage
                        // console.log("I just said:", myText);
                    }

                } catch (e) {
                    console.error("Parse Error", e);
                }
            };

            socket.onclose = () => {
                setIsVoiceConnected(false);
                setVoiceStatus("Disconnected");
            }

        } catch (e: any) {
            console.error("Voice Error", e);
            setVoiceStatus("Error: " + e.message);
        }
    };

    const startMicrophone = (socket: WebSocket) => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext({ sampleRate: 16000 });

        navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                autoGainControl: true,
                noiseSuppression: true
            }
        }).then(stream => {
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                if (socket.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16 PCM
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Base64 Encode
                // Using a rough manual conversion for speed/compat without extra heavy libs, 
                // or just standard btoa on string info.
                let binary = '';
                const bytes = new Uint8Array(pcmData.buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                socket.send(JSON.stringify({
                    realtime_input: {
                        media_chunks: [{
                            mime_type: "audio/pcm",
                            data: base64
                        }]
                    }
                }));
            };

            source.connect(processor);
            processor.connect(ctx.destination);
        }).catch(err => {
            console.error("Mic Error:", err);
            setVoiceStatus("Mic Access Denied");
        });
    }

    const clearHistory = () => {
        setMessages([]);
        chrome.storage.session.remove('chatHistory');
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (mode === 'VOICE_CHAT') {
        return (
            <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <div className="w-[300px] h-[300px] bg-blue-500 rounded-full blur-[100px] animate-pulse"></div>
                </div>

                <header className="p-4 flex items-center justify-between z-10 backdrop-blur-md bg-black/20">
                    <h1 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Agent Live</h1>
                    <button onClick={() => {
                        stopAudio();
                        setMode('AGENT');
                        // Force close socket if open
                        // (Ideally we track socket ref, but effect cleanup handles it too or we rely on re-render)
                        window.location.reload(); // Simple brute force to ensure full audio context cleanup for prototype
                    }} className="text-xs bg-white/10 px-3 py-1 rounded-full hover:bg-white/20">Back & Stop</button>
                </header>

                <div className="flex-1 flex flex-col items-center z-10 space-y-4 w-full max-w-full overflow-hidden">
                    {/* Visualizer Area (Strict 30% Height) */}
                    <div className="flex-none h-[30%] w-full flex flex-col items-center justify-center pt-4">
                        <div className={cn("relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500",
                            isVoiceConnected ? "bg-white/10 shadow-[0_0_50px_rgba(100,200,255,0.3)]" : "bg-red-500/10")}>

                            {/* Orb */}
                            <div className={cn("w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse",
                                isVoiceConnected ? "scale-110 duration-[2000ms]" : "scale-100 grayscale")} />

                            {/* Rings */}
                            {isVoiceConnected && (
                                <>
                                    <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-ping [animation-duration:3s]"></div>
                                    <div className="absolute inset-[-10px] rounded-full border border-purple-400/20 animate-ping [animation-duration:2s]"></div>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-2 mt-4">
                            <p className="text-white/70 font-mono text-xs tracking-widest uppercase animate-pulse">
                                {voiceStatus}
                            </p>

                            {/* Emergency Stop Button */}
                            <button
                                onClick={() => stopAudio()}
                                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 px-4 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all"
                            >
                                STOP AUDIO
                            </button>
                        </div>
                    </div>

                    {/* Transcript Chat Area */}
                    <div className="flex-1 w-full bg-black/40 backdrop-blur-sm rounded-t-2xl border-t border-white/10 p-4 overflow-y-auto scroll-smooth mask-image-b">
                        <div className="space-y-4">
                            {messages.filter(m => m.timestamp > 0).map((msg) => (
                                <div key={msg.id} className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                                    <span className="text-[10px] uppercase tracking-wider text-white/40 ml-1">{msg.role}</span>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm max-w-[90%] leading-relaxed shadow-lg relative group",
                                        msg.role === 'user'
                                            ? "bg-blue-600/80 text-white rounded-br-none"
                                            : "bg-white/10 text-slate-200 rounded-bl-none border border-white/5"
                                    )}>
                                        {msg.content}
                                        {/* Copy Button for Agent */}
                                        {msg.role === 'agent' && (
                                            <button
                                                onClick={() => copyToClipboard(msg.content, msg.id)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-black/30 rounded hover:bg-black/50"
                                            >
                                                {copiedId === msg.id ? <IconCheck className="w-3 h-3 text-emerald-400" /> : <IconCopy className="w-3 h-3 text-white/70" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} className="h-4" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }



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
