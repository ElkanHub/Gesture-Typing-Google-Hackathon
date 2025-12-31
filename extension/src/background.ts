
// Listen for side panel toggles
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender) => {
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
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        console.log("Agent Response:", data);

        // Send back to side panel (if open) or content script
        // For now, simpler to log.

        // Use TTS here if needed, or if API returns an audio URL.
        if (data.audioUrl) {
            // Play Audio
            const audio = new Audio(data.audioUrl);
            audio.play();
        }

    } catch (e) {
        console.error("Agent API Call Failed", e);
    }
}
