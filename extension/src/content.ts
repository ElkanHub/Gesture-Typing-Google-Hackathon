import { GestureProcessor } from './gesture-logic';
import { getKeyCoordinates } from './keymap';

console.log('Physical Gesture Extension: Content Script Loaded');

const processor = new GestureProcessor((state) => updateStatus(state));

// Visualizer
const trailContainer = document.createElement('div');
trailContainer.style.position = 'fixed';
trailContainer.style.top = '0';
trailContainer.style.left = '0';
trailContainer.style.width = '100vw';
trailContainer.style.height = '100vh';
trailContainer.style.pointerEvents = 'none';
trailContainer.style.zIndex = '999999';
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


function showKeyVisual(key: string) {
    const coords = getKeyCoordinates(key);
    // Project keyboard coords to screen bottom-center
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

    // Fade out
    setTimeout(() => {
        dot.style.opacity = '0';
        setTimeout(() => dot.remove(), 500);
    }, 100);
}


// --- Mode Switching Logic ---
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
    } else {
        processor.setAgentEnabled(true);
        updateStatus('inactive', 'Agent Mode (Click to focus input)');
        chrome.runtime.sendMessage({ type: 'MODE_CHANGED', mode: 'AGENT' }).catch(() => { });
    }
}

document.addEventListener('focusin', updateMode);
document.addEventListener('focusout', () => {
    // Delay slightly to allow focus to move to new element
    setTimeout(updateMode, 50);
});

// Initial check
updateMode();

document.addEventListener('keydown', (e) => {
    // Basic Filter: Only letters and space
    if (e.key.length === 1) {
        const key = e.key.toLowerCase();
        const { x, y } = getKeyCoordinates(key);
        processor.addPoint(key, x, y);
        showKeyVisual(key);
        console.log(`[Gesture] Key: ${key} (${x}, ${y})`);
    } else if (e.key === 'Enter') {
        // Force confirm or newline if needed
    }
});
