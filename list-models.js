
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

function getEnvVar(key) {
    const defaultEnvPath = path.resolve(process.cwd(), '.env');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');

    let content = '';
    if (fs.existsSync(localEnvPath)) {
        content = fs.readFileSync(localEnvPath, 'utf-8');
    } else if (fs.existsSync(defaultEnvPath)) {
        content = fs.readFileSync(defaultEnvPath, 'utf-8');
    }

    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : process.env[key];
}

async function listAllModels() {
    const apiKey = getEnvVar('GEMINI_API_KEY') || getEnvVar('GOOGLE_API_KEY');
    if (!apiKey) {
        console.error("No API KEY found");
        return;
    }

    // Access the API directly/via undocumented/simpler fetch if SDK listing is obscure,
    // but better to try SDK first if possible, or just hit the REST endpoint.

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        console.log("Fetching model list via REST...");
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Found models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods})`);
            });
        } else {
            console.log("No models returned:", data);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

listAllModels();
