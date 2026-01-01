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
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 12px;
        padding: 6px 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: none;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        font-family: sans-serif;
        transition: opacity 0.2s, transform 0.2s;
        transform: translateY(10px);
        opacity: 0;
        max-width: 400px;
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
        background: transparent;
        border: 1px solid transparent;
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 14px;
        color: #333;
        cursor: pointer;
        transition: all 0.1s;
    }
    .pg-candidate-btn:hover {
        background: #f0f0f0;
    }
    .pg-candidate-btn.pg-primary {
        background: #3b82f6;
        color: white;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    }
    .pg-loader {
        width: 14px;
        height: 14px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: pg-spin 0.8s linear infinite;
        margin-left: 8px;
    }
    @keyframes pg-spin {
        to { transform: rotate(360deg); }
    }
    /* Hide scrollbar */
    #pg-suggestion-bar::-webkit-scrollbar {
        height: 0px;
        background: transparent;
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

    // Render candidates
    candidates.slice(0, 10).forEach((word, index) => {
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
