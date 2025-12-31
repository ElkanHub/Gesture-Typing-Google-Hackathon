import { GestureProcessor } from './gesture-logic';

console.log('Physical Gesture Extension: Content Script Loaded');

// Bridge to your Next.js Brain
const processor = new GestureProcessor();
const API_URL = 'http://localhost:3000/api/predict';

document.addEventListener('keydown', (e) => {
    // Only track if not in special fields (password etc) - TODO
    // For now, track everything for hackathon demo

    // We need screen coordinates for the key.
    // Since physical keyboard doesn't give X/Y, we map based on a fixed QWERTY virtual layout or previous calibration.
    // For the hackathon "Speed" version, we will assume a standard 1920x1080 scaling for now or just generic relative coordinates.
    // Actually, to make it "Universal", we might need the @shared/layouts to map Key -> Virtual X/Y.

    // For this step, let's just log the flow.
    processor.addPoint(e.key, 0, 0); // 0,0 placeholders until we import the KeyMap

    if (API_URL && e.key === 'Enter') {
        console.log('Force processing...');
        processor.process();
    }
});
