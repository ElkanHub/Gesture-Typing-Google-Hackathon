
// Audio Context configured for Gemini Live API (24kHz is typical for some models, but 2.5 uses 24000)
let audioCtx: AudioContext | null = null;

export function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioCtx;
}

// Queue to prevent overlapping audio (The "Scream" fix)
let isPlaying = false;
let audioQueue: string[] = [];
let currentSource: AudioBufferSourceNode | null = null;

export async function playPCM(base64Data: string) {
    audioQueue.push(base64Data);
    processQueue();
}

export function stopAudio() {
    isPlaying = false;
    audioQueue = []; // Clear queue
    if (currentSource) {
        try {
            currentSource.stop();
        } catch (e) {
            // ignore if already stopped
        }
        currentSource = null;
    }
}

async function processQueue() {
    if (isPlaying || audioQueue.length === 0) return;

    isPlaying = true;
    const chunk = audioQueue.shift();

    try {
        if (chunk) {
            await playChunk(chunk);
        }
    } catch (e) {
        console.error("Audio Playback Error", e);
        isPlaying = false; // ensure recovers
    } finally {
        // Only continue if not stopped
        if (isPlaying) {
            isPlaying = false;
            if (audioQueue.length > 0) processQueue();
        }
    }
}

function playChunk(base64Data: string): Promise<void> {
    return new Promise(async (resolve) => {
        const ctx = initAudioContext();
        if (!ctx) { resolve(); return; }

        if (ctx.state === 'suspended') await ctx.resume();

        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;

        const buffer = ctx.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        currentSource = source; // Track current source

        source.onended = () => {
            currentSource = null;
            resolve();
        };

        source.start();
    });
}
