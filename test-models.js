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

async function listModels() {
    try {
        const apiKey = getEnvVar('GEMINI_API_KEY') || getEnvVar('GOOGLE_API_KEY');
        if (!apiKey) {
            console.error("No API KEY found");
            return;
        }
        const genAI = new GoogleGenerativeAI(apiKey);

        const testModel = async (modelName) => {
            console.log(`Checking '${modelName}'...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            try {
                // Try generating a simple image prompt
                const res = await model.generateContent("A small red circle");
                console.log(`Success with '${modelName}'!`);
                console.log("Response:", res.response ? "Response object present" : "No response object");
                // Check for image bits if possible, but success is enough for API availability
            } catch (e) {
                console.log(`Failed '${modelName}':`, e.message.split('\n')[0]);
            }
        }

        // Test potential model IDs for "nanobanana"
        await testModel("gemini-2.0-flash-exp"); // Fallback check
        await testModel("gemini-2.5-flash"); // As per search
        await testModel("nanobanana"); // Direct name
        // await testModel("gemini-3.0-flash"); // Future proof check?

    } catch (e) {
        console.error("Error:", e);
    }
}

listModels();
