import { GestureProcessor } from './gesture-logic';
import { getKeyCoordinates } from './keymap';

console.log("Physical Gesture Extension: Content Script Loaded");

// Processor initialized at bottom

// --- STYLES ---
const style = document.createElement('style');
style.textContent = `
    #pg-suggestion-bar {
        position: fixed;
        z-index: 999999;
        height: 56px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 16px;
        padding: 0 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        display: none;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateY(10px);
        opacity: 0;
        max-width: 90vw;
        overflow-x: auto;
        white-space: nowrap;
        pointer-events: auto;
    }
    #pg-suggestion-bar.pg-visible {
        display: flex;
        transform: translateY(0);
        opacity: 1;
    }
    .pg-candidate-btn {
        appearance: none;
        outline: none;
        border: 1px solid #e5e7eb;
        background: white;
        color: #374151;
        border-radius: 9999px;
        padding: 6px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
        line-height: 1.5;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .pg-candidate-btn:hover {
        background: #f9fafb;
        transform: scale(1.02);
    }
    .pg-candidate-btn:active {
        transform: scale(0.98);
    }
    .pg-candidate-btn.pg-primary {
        background: #2563eb;
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3), 0 2px 4px -1px rgba(37, 99, 235, 0.15);
    }
    .pg-candidate-btn.pg-primary:hover {
        background: #1d4ed8;
    }
    .pg-loader {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: pg-spin 0.8s linear infinite;
        margin-left: 8px;
        flex-shrink: 0;
    }
    @keyframes pg-spin {
        to { transform: rotate(360deg); }
    }
    /* Hide scrollbar */
    #pg-suggestion-bar::-webkit-scrollbar {
        display: none;
    }
    #pg-suggestion-bar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
`;
document.head.appendChild(style);

// --- UI ELEMENTS ---
const suggestionBar = document.createElement('div');
suggestionBar.id = 'pg-suggestion-bar';
document.body.appendChild(suggestionBar);

// Visualizer Container
const trailContainer = document.createElement('div');
trailContainer.style.position = 'fixed';
trailContainer.style.top = '0';
trailContainer.style.left = '0';
trailContainer.style.width = '100vw';
trailContainer.style.height = '100vh';
trailContainer.style.pointerEvents = 'none';
trailContainer.style.zIndex = '999998';
document.body.appendChild(trailContainer);

// Status Indicator
const statusDot = document.createElement('div');
statusDot.style.position = 'fixed';
statusDot.style.bottom = '20px';
statusDot.style.right = '20px';
statusDot.style.width = '12px';
statusDot.style.height = '12px';
statusDot.style.borderRadius = '50%';
statusDot.style.backgroundColor = 'gray';
statusDot.style.zIndex = '1000000';
statusDot.style.border = '2px solid white';
statusDot.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
statusDot.title = 'Gesture Agent: Inactive';
document.body.appendChild(statusDot);

// --- LOGIC ---
const processor = new GestureProcessor(
    (state, msg) => updateStatus(state, msg),
    (candidates, isPredicting) => updateSuggestions(candidates, isPredicting)
);

function updateStatus(state: 'active' | 'inactive' | 'processing' | 'success' | 'error', msg?: string) {
    statusDot.title = msg || state;
    if (state === 'active') statusDot.style.backgroundColor = '#4ade80'; // Green
    else if (state === 'processing') statusDot.style.backgroundColor = '#facc15'; // Yellow
    else if (state === 'inactive') statusDot.style.backgroundColor = '#9ca3af'; // Gray
    else if (state === 'success') {
        statusDot.style.backgroundColor = '#3b82f6'; // Blue
        setTimeout(() => updateStatus('active'), 1000);
    }
    else if (state === 'error') {
        statusDot.style.backgroundColor = '#ef4444'; // Red
        setTimeout(() => updateStatus('active'), 2000);
    }
}

function updateSuggestions(candidates: string[], isPredicting: boolean) {
    suggestionBar.innerHTML = '';

    if (candidates.length === 0 && !isPredicting) {
        suggestionBar.classList.remove('pg-visible');
        return;
    }

    // Show bar
    suggestionBar.classList.add('pg-visible');
    repositionBar();

    // Render candidates - Limit to first 6 explicitly
    candidates.slice(0, 6).forEach((word, index) => {
        const btn = document.createElement('button');
        btn.textContent = word;
        btn.className = `pg-candidate-btn ${index === 0 ? 'pg-primary' : ''}`;

        // Correcting click handler
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            processor.correctText(word);
            // Don't hide immediately, let user see selection? Or hide? 
            // Usually suggestion bars stay open for next word prediction, 
            // but we don't have next word yet.
            // Let's keep it visible for a moment or until next typing.
        };
        suggestionBar.appendChild(btn);
    });

    if (isPredicting) {
        const loader = document.createElement('div');
        loader.className = 'pg-loader';
        suggestionBar.appendChild(loader);
    }
}

function repositionBar() {
    const active = document.activeElement as HTMLElement;
    if (!active || !suggestionBar.classList.contains('pg-visible')) return;

    const rect = active.getBoundingClientRect();
    const barHeight = 50;

    // Default: Above the input
    let top = rect.top - barHeight - 10;

    // If closes to top edge, flip to below
    if (top < 10) {
        top = rect.bottom + 10;
    }

    suggestionBar.style.top = `${top}px`;
    suggestionBar.style.left = `${Math.max(10, rect.left)}px`;
}


function showKeyVisual(key: string) {
    const coords = getKeyCoordinates(key);
    const screenX = (window.innerWidth / 2) - 200 + coords.x;
    const screenY = window.innerHeight - 150 + coords.y;

    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.left = `${screenX}px`;
    dot.style.top = `${screenY}px`;
    dot.style.width = '20px';
    dot.style.height = '20px';
    dot.style.backgroundColor = 'rgba(0, 255, 128, 0.6)';
    dot.style.borderRadius = '50%';
    dot.style.transition = 'opacity 0.5s ease-out';
    trailContainer.appendChild(dot);

    setTimeout(() => {
        dot.style.opacity = '0';
        setTimeout(() => dot.remove(), 500);
    }, 100);
}


// --- EVENT LISTENERS ---

// Position updates
window.addEventListener('resize', repositionBar);
window.addEventListener('scroll', repositionBar, true);
document.addEventListener('focusin', () => {
    updateMode();
    // Maybe show suggestions if we have some stored?
});
document.addEventListener('focusout', () => {
    // Hide bar after delay
    setTimeout(() => {
        // suggestionBar.classList.remove('pg-visible');
        updateMode();
    }, 200);
});


function updateMode() {
    const active = document.activeElement as HTMLElement;
    const isInput = active && (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active.isContentEditable
    );

    if (isInput) {
        processor.setAgentEnabled(false);
        updateStatus('active', 'Typing Mode');
        chrome.runtime.sendMessage({ type: 'MODE_CHANGED', mode: 'TYPING' }).catch(() => { });
        repositionBar();
    } else {
        processor.setAgentEnabled(true);
        updateStatus('inactive', 'Agent Mode');
        chrome.runtime.sendMessage({ type: 'MODE_CHANGED', mode: 'AGENT' }).catch(() => { });
        suggestionBar.classList.remove('pg-visible');
    }
}


// --- AUDIO PLAYBACK UI ---
const audioPlayer = document.createElement('div');
audioPlayer.id = 'pg-audio-player';
audioPlayer.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
        <span id="pg-audio-status" style="font-size:14px; font-weight:600; color:#374151;">Playing...</span>
        <div style="display:flex; gap:8px;">
            <button id="pg-pause-btn" class="pg-control-btn">Pause</button>
            <button id="pg-stop-btn" class="pg-control-btn">Stop</button>
        </div>
    </div>
`;
// Styles for player
const playerStyle = `
    #pg-audio-player {
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: none;
        z-index: 1000001;
        font-family: system-ui, sans-serif;
        border: 1px solid #e5e7eb;
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .pg-control-btn {
        background: #f3f4f6;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
        color: #1f2937;
    }
    .pg-control-btn:hover { background: #e5e7eb; }
    @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
style.textContent += playerStyle;
document.body.appendChild(audioPlayer);

let currentAudioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let isPaused = false;

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PLAY_AUDIO') {
        console.log("Received Audio Data, Playing...");
        playNativeAudio(message.audio);
    }
});

function playNativeAudio(base64: string) {
    // Stop existing
    stopAudio();

    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        currentAudioCtx = new AudioContext({ sampleRate: 24000 }); // Gemini 2.0 uses 24kHz

        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);

        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }

        const buffer = currentAudioCtx.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        currentSource = currentAudioCtx.createBufferSource();
        currentSource.buffer = buffer;
        currentSource.connect(currentAudioCtx.destination);
        currentSource.onended = () => {
            // Hide player when done naturally
            audioPlayer.style.display = 'none';
        };
        currentSource.start();

        // Show UI
        audioPlayer.style.display = 'block';
        updatePlayerUI('Playing');
        isPaused = false;

    } catch (e) {
        console.error("Audio Playback Failed:", e);
    }
}

function stopAudio() {
    if (currentSource) {
        try { currentSource.stop(); } catch (e) { }
        currentSource = null;
    }
    if (currentAudioCtx) {
        currentAudioCtx.close();
        currentAudioCtx = null;
    }
    audioPlayer.style.display = 'none';
}

function togglePause() {
    if (!currentAudioCtx) return;

    if (currentAudioCtx.state === 'running') {
        currentAudioCtx.suspend();
        isPaused = true;
        updatePlayerUI('Paused');
    } else if (currentAudioCtx.state === 'suspended') {
        currentAudioCtx.resume();
        isPaused = false;
        updatePlayerUI('Playing');
    }
}

function updatePlayerUI(status: string) {
    const statusEl = document.getElementById('pg-audio-status');
    const pauseBtn = document.getElementById('pg-pause-btn');
    if (statusEl) statusEl.textContent = status + "...";
    if (pauseBtn) pauseBtn.textContent = status === 'Playing' ? 'Pause' : 'Resume';
}

// Bind Controls
document.getElementById('pg-pause-btn')?.addEventListener('click', togglePause);
document.getElementById('pg-stop-btn')?.addEventListener('click', stopAudio);


// Initial check
try {
    updateMode();

    document.addEventListener('keydown', (e) => {
        if (e.key.length === 1) {
            const key = e.key.toLowerCase();
            const { x, y } = getKeyCoordinates(key);
            processor.addPoint(key, x, y);
            showKeyVisual(key);

            // Hide bar on typing? 
            // Usually yes, until gesture finishes.
            // But for simple typing we might want predictions later.
        }
    });

} catch (err) {
    console.error("FATAL ERROR IN EXTENSION CONTENT SCRIPT:", err);
    updateStatus('error', 'Extension Crashed');
}
