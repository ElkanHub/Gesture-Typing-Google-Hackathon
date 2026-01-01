
// Listen for side panel toggles
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse) => {
    if (message.type === 'PREDICT_GESTURE') {
        handlePrediction(message.sequence, message.analysis, message.candidates, message.context, message.keyMap)
            .then(result => sendResponse(result));
        return true; // Keep channel open
    }

    if (message.type === 'AGENT_ACTION') {
        console.log("Background received action:", message.action);

        // Open the side panel to show progress
        if (sender.tab?.id) {
            // We can't programmatically open side panel easily without user gesture unless on click
            // But for hackathon, let's assume it's open or we use a bubble.
            // Actually, Chrome allows opening side panel on interaction? 
            // "chrome.sidePanel.open" requires user interaction.
            // We will rely on user having opened it, or send a toast content script.
        }

        handleAgentAction(message.action, message.text);
    }
});

async function handleAgentAction(action: string, text: string) {
    const endpoint = `http://localhost:3000/api/agent/${action.toLowerCase()}`;

    try {
        // Notify UI: Processing
        chrome.runtime.sendMessage({ type: 'AGENT_STATUS', status: 'Thinking...' }).catch(() => { });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        console.log("Agent Response:", data);

        // Notify UI: Success
        chrome.runtime.sendMessage({
            type: 'AGENT_RESPONSE',
            text: data.summary || data.text || "Done."
        }).catch(() => { });

        // Play Audio if available
        if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audio.play();
        }

    } catch (e) {
        console.error("Agent API Call Failed", e);
        chrome.runtime.sendMessage({ type: 'AGENT_STATUS', status: 'Error' }).catch(() => { });
    }
}

async function handlePrediction(sequence: string, analysis: any, candidates: any[], context: string, keyMap: any) {
    try {
        const response = await fetch('http://localhost:3000/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sequence, // Forward string
                anchors: analysis.anchors,
                candidates: candidates || [],
                context: context || "",
                keyMap: keyMap || {}
            })
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`API Error ${response.status}: ${txt.substring(0, 50)}`);
        }

        const data = await response.json();
        return { success: true, word: data.predictions?.[0] || null, all: data.predictions };
    } catch (e: any) {
        console.error("Prediction failed", e);
        return { success: false, error: e.message || "Unknown error" };
    }
}
