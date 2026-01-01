
// Listen for side panel toggles
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse) => {
    if (message.type === 'PREDICT_GESTURE') {
        handlePrediction(message.sequence, message.analysis, message.candidates, message.context, message.keyMap)
            .then(result => sendResponse(result));
        return true; // Keep channel open
    }

    if (message.type === 'AGENT_ACTION') {
        console.log("Agent Action:", message.action);

        // 1. Attempt to Open Side Panel (Might fail if gesture token lost)
        if (sender.tab?.id) {
            chrome.sidePanel.open({ tabId: sender.tab.id }).catch((err) => {
                console.warn("Could not auto-open panel (likely missing gesture):", err);
            });
        }

        // 2. Persist Initial State
        const timestamp = Date.now();
        const initialMessages = [
            { id: `u-${timestamp}`, role: 'user', content: `Action: ${message.action}`, timestamp },
            { id: `a-${timestamp}`, role: 'agent', content: 'Thinking...', timestamp: timestamp + 1, actions: [] }
        ];

        // We accumulate, but for now let's just push to a list
        chrome.storage.session.get(['chatHistory'], (result) => {
            const rawHistory = result.chatHistory;
            const history: any[] = Array.isArray(rawHistory) ? rawHistory : [];
            const newHistory = [...history, ...initialMessages];
            chrome.storage.session.set({ chatHistory: newHistory });

            // Notify open UI
            chrome.runtime.sendMessage({ type: 'CHAT_UPDATE', messages: newHistory }).catch(() => { });
        });

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
        const responseText = data.summary || data.text || "Done.";

        // Update History with Real Response
        chrome.storage.session.get(['chatHistory'], (result) => {
            const rawHistory = result.chatHistory;
            const history: any[] = Array.isArray(rawHistory) ? rawHistory : [];
            // Find the last "Thinking..." agent message and update it
            const updatedHistory = history.map((msg: any, index: number) => {
                if (index === history.length - 1 && msg.role === 'agent') {
                    return { ...msg, content: responseText, actions: ['copy'] };
                }
                return msg;
            });

            chrome.storage.session.set({ chatHistory: updatedHistory });
            chrome.runtime.sendMessage({ type: 'CHAT_UPDATE', messages: updatedHistory }).catch(() => { });
        });

    } catch (e) {
        console.error("Agent API Call Failed", e);
        // Error State
        chrome.storage.session.get(['chatHistory'], (result) => {
            const rawHistory = result.chatHistory;
            const history: any[] = Array.isArray(rawHistory) ? rawHistory : [];
            const updatedHistory = [...history, {
                id: `err-${Date.now()}`,
                role: 'agent',
                content: "Error: Could not reach agent.",
                timestamp: Date.now()
            }];
            chrome.storage.session.set({ chatHistory: updatedHistory });
            chrome.runtime.sendMessage({ type: 'CHAT_UPDATE', messages: updatedHistory }).catch(() => { });
        });
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
