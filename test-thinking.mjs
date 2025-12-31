
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
const ai = new GoogleGenAI({ apiKey });

async function testThinking() {
    console.log("Testing gemini-3-flash-preview with Thinking...");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'Why is the sky blue?',
            config: {
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: 'low'
                }
            }
        });
        console.log("Flash Response valid:", !!response.candidates);
        // Check for thoughts
        const parts = response.candidates[0].content.parts;
        const thoughts = parts.find(p => p.thought);
        console.log("Flash has thoughts:", !!thoughts);
    } catch (e) {
        console.error("Flash Thinking Failed:", e.message);
    }
}

testThinking();
