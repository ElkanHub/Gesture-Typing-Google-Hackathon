import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image, userPrompt } = await req.json();

        if (!image || typeof image !== "string") {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key missing" }, { status: 500 });
        }

        const googleAI = new GoogleGenAI({ apiKey });
        const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        /**
         * STAGE 1: Visual Reasoning with Gemini 3 Pro
         * We use gemini-3-pro-preview because it supports explicit 'thinkingLevel'.
         */
        console.log("Analyzing sketch with Gemini 3 Pro reasoning...");

        const visionPrompt = `
            Analyze this hand-drawn sketch. Use your high-level reasoning to:
            1. Infer the user's creative intent from rough shapes.
            2. Generate a highly detailed prompt for a photorealistic image generator.
            3. Include specific details about lighting, material textures, and depth of field.
            ${userPrompt ? `CRITICAL USER CONTEXT: "${userPrompt}"` : ""}
            Output ONLY the photorealistic description. Start with "A professional photograph of..."
        `;

        const visionRes = await googleAI.models.generateContent({
            // Using the Pro reasoning model for the logic phase
            model: "gemini-3-pro-preview",
            contents: [{
                role: "user",
                parts: [
                    { text: visionPrompt },
                    { inlineData: { mimeType: "image/webp", data: base64Data } }
                ]
            }],
            config: {
                // FIXED: Gemini 3 Pro supports thinkingLevel
                thinkingConfig: {
                    thinkingLevel: "high" as any
                }
            }
        });

        const description = visionRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!description) throw new Error("Reasoning model failed to return a description.");

        console.log("Gemini 3 'High' Thinking Result:", description);

        /**
         * STAGE 2: High-Fidelity Render with Imagen 4.0 Fast
         */
        console.log("Generating final render with Imagen 4.0 Fast...");

        const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`;

        const predictRes = await fetch(predictUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [{ prompt: description }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1",
                    safetySetting: "block_low_and_above",
                    personGeneration: "allow_adult"
                }
            })
        });

        if (!predictRes.ok) {
            const errText = await predictRes.text();
            throw new Error(`Imagen 4 failed: ${errText}`);
        }

        const predictData = await predictRes.json();
        const b64 = predictData.predictions[0]?.bytesBase64Encoded;

        return NextResponse.json({
            image: `data:image/png;base64,${b64}`,
            thought: description // Send the thinking result back to UI
        });

    } catch (error: any) {
        console.error("Pipeline Error:", error);
        return NextResponse.json(
            { error: "Generation failed", details: error.message },
            { status: 500 }
        );
    }
}