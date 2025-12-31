
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

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

const apiKey = getEnvVar('GEMINI_API_KEY') || getEnvVar('GOOGLE_API_KEY');

if (!apiKey) {
    console.error("No API KEY found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function askGemini3() {
    const models = ['gemini-2.0-flash-exp', 'gemini-3-pro-preview', 'gemini-3-flash-preview'];

    for (const modelName of models) {
        console.log(`\nTesting ${modelName}...`);
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: 'Hello',
            });

            console.log(`SUCCESS: ${modelName} is working.`);
            console.log("Response:", response.candidates?.[0]?.content?.parts?.[0]?.text);
        } catch (e) {
            console.error(`FAILED: ${modelName} - ${e.message}`);
        }
    }
}

askGemini3();
