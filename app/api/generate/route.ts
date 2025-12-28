import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image, userPrompt } = await req.json();

        if (!image || typeof image !== "string") {
            return NextResponse.json(
                { error: "No image provided or invalid format" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "API key missing" }, { status: 500 });
        }

        // Initialize with the v1beta API to access Gemini 3 preview features
        const googleAI = new GoogleGenAI({ apiKey });

        // Clean the base64 string
        const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        /**
         * STAGE 1: Use Gemini 3 Pro Image to analyze the sketch.
         * Gemini 3 Pro Image (Nano Banana Pro) is specifically tuned 
         * for understanding artistic composition.
         */
        console.log("Analyzing sketch with Gemini 3 Pro Image...");

        let visionPrompt = `
            Act as an expert art director. Analyze this hand-drawn sketch.
            1. Identify the core subject and composition.
            2. Translate these rough shapes into a high-end, photorealistic prompt.
            3. Describe lighting, textures (cinematic 8k), and depth of field.
            DO NOT mention it is a sketch. Start your description with 'A professional studio photograph of...'.
        `;

        if (userPrompt?.trim()) {
            visionPrompt += `\n\nUSER'S INTENT: "${userPrompt.trim()}". Prioritize this intent while following the sketch's layout.`;
        }

        const visionRes = await googleAI.models.generateContent({
            model: "gemini-3-pro-image-preview", // The official Gemini 3 reasoning-vision model
            contents: [{
                role: "user",
                parts: [
                    { text: visionPrompt },
                    { inlineData: { mimeType: "image/webp", data: base64Data } }
                ]
            }],
            config: {
                // Gemini 3 exclusive: Set thinking level to high for deep reasoning
                // @ts-ignore - Preview feature types might be missing or strict
                thinkingConfig: {
                    thinkingLevel: "high" as any
                }
            }
        });

        const description = visionRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!description) throw new Error("Gemini 3 failed to interpret the sketch.");

        console.log("Gemini 3 Reasoning Result:", description);

        /**
         * STAGE 2: Generate the final high-fidelity image with Imagen 4.0 Fast.
         * Imagen 4 uses the 'predict' method for speed-optimized generation.
         */
        console.log("Generating final render with Imagen 4.0 Fast...");

        const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`;

        const predictRes = await fetch(predictUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [
                    { prompt: description }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1", // Options: 1:1, 4:3, 16:9
                    safetySetting: "block_medium_and_above",
                    personGeneration: "allow_adult" // Imagen 4 standard parameter
                }
            })
        });

        if (!predictRes.ok) {
            const errText = await predictRes.text();
            throw new Error(`Imagen 4 failed: ${errText}`);
        }

        const predictData = await predictRes.json();
        const b64 = predictData.predictions[0]?.bytesBase64Encoded;

        if (!b64) throw new Error("No image data returned from Imagen 4.");

        // Return the final image and the "thought" (description) for the UI
        return NextResponse.json({
            image: `data:image/png;base64,${b64}`,
            thought: description
        });

    } catch (error: any) {
        console.error("Pipeline Error:", error);
        return NextResponse.json(
            { error: "Generation failed", details: error.message },
            { status: 500 }
        );
    }
}
