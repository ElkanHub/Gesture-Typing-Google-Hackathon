
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Helper to read .env or .env.local
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

async function checkImagen() {
    const apiKey = getEnvVar('GEMINI_API_KEY') || getEnvVar('GOOGLE_API_KEY');
    if (!apiKey) {
        console.error("No API KEY found in .env or .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    console.log("Checking 'imagen-3.0-generate-001'...");
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    try {
        // Simple prompt
        const result = await model.generateContent("A small red circle");
        console.log("Success! Imagen is available.");
        console.log("Response keys:", Object.keys(result));
    } catch (e) {
        console.error("Imagen Check Failed:", e.message);

        // Try fallback check for other models
        try {
            console.log("Checking 'gemini-1.5-flash'...");
            const flash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            await flash.generateContent("Hello");
            console.log("'gemini-1.5-flash' is working.");
        } catch (e2) {
            console.error("'gemini-1.5-flash' also failed:", e2.message);
        }
    }
}

checkImagen();
