import { GestureProcessor } from './gesture-logic';
import { getKeyCoordinates } from './keymap';

console.log('Physical Gesture Extension: Content Script Loaded');

const processor = new GestureProcessor();

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
        chrome.runtime.sendMessage({ type: 'MODE_CHANGED', mode: 'TYPING' }).catch(() => { });
    } else {
        processor.setAgentEnabled(true);
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
        const { x, y } = getKeyCoordinates(e.key);
        processor.addPoint(e.key, x, y);
        showKeyVisual(e.key);
        console.log(`[Gesture] Key: ${e.key} (${x}, ${y})`);
    } else if (e.key === 'Enter') {
        // Force confirm or newline if needed
    }
});
