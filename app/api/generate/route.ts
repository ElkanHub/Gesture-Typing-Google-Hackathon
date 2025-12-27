
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image || typeof image !== "string") {
            return NextResponse.json(
                { error: "No image provided or invalid format" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key missing" },
                { status: 500 }
            );
        }

        const googleAI = new GoogleGenAI({ apiKey });

        const base64Data = image.replace(
            /^data:image\/(png|jpeg|jpg|webp);base64,/,
            ""
        );

        // First: Use Vision model to describe the sketch detailedly
        // This is necessary because some Image models don't accept image inputs directly (sketch-to-image), or require specific formats.
        // But let's try direct sketch-to-image with Imagen 4 if possible.
        // However, usually "predict" models are Text-to-Image.
        // Strategy: 
        // 1. Describe sketch with Gemini 2.0 Flash.
        // 2. Generate Image with Imagen 4.0 using the description.

        console.log("Analyzing sketch with Gemini...");
        const visionRes = await googleAI.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{
                role: "user",
                parts: [
                    { text: "Describe this sketch in extreme detail for a photorealistic image generator. Describe the subject, pose, composition, background, and lighting. Do not mention it is a sketch. Say 'A photograph of...'. Then suggest what the user is looking for by that composition and profidea photo realistic image. Not just a raw shapes" },
                    { inlineData: { mimeType: "image/webp", data: base64Data } }
                ]
            }]
        });

        const description = visionRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!description) throw new Error("Failed to interpret sketch");

        console.log("Sketch Description:", description);

        // Second: Generate Image with Imagen 4
        // Note: Imagen 4.0 Fast on Generative Language API supports 'predict', not 'generateContent'.
        console.log("Generating image with Imagen 4.0 via predict...");

        const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`;

        const predictRes = await fetch(predictUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [
                    { prompt: description }
                ],
                parameters: {
                    sampleCount: 1
                }
            })
        });

        if (!predictRes.ok) {
            const errText = await predictRes.text();
            throw new Error(`Imagen predict failed (${predictRes.status}): ${errText}`);
        }

        const predictData = await predictRes.json();
        console.log("Imagen Predict Response Keys:", Object.keys(predictData));

        if (!predictData.predictions || predictData.predictions.length === 0) {
            throw new Error("No predictions returned");
        }

        const prediction = predictData.predictions[0];
        // The format is typically { bytesBase64Encoded: "..." } or similar.
        const b64 = prediction.bytesBase64Encoded || prediction.image?.bytesBase64Encoded || prediction;

        if (typeof b64 !== "string") {
            console.error("Prediction structure:", JSON.stringify(prediction, null, 2));
            throw new Error("Unexpected prediction format - could not find base64 string");
        }

        const dataUrl = `data:image/png;base64,${b64}`;

        return NextResponse.json({ image: dataUrl });

    } catch (error: any) {
        console.error("Gemini Image Route Error:", error);
        return NextResponse.json(
            {
                error: "Image generation failed",
                details: error.message ?? "Unknown error"
            },
            { status: 500 }
        );
    }
}
