import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Helper to reliably encode chunks for the stream
function encodeChunk(data: any) {
    return new TextEncoder().encode(JSON.stringify(data) + "\n");
}

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

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const send = (type: "status" | "thought" | "image" | "error", content: string, metadata?: any) => {
                    controller.enqueue(encodeChunk({ type, content, ...metadata }));
                };

                try {
                    // --- STAGE 1: PLAN (Gemini 3 Pro) ---
                    send("status", "Agent starts planning...");

                    const visionPrompt = `
                        Analyze this hand-drawn sketch. 
                        1. Infer the creative intent.
                        2. Create a detailed prompt for a photorealistic image generator.
                        3. CRITICAL: Capture the "Vibe", lighting, and materials.
                        ${userPrompt ? `USER HINT: "${userPrompt}"` : ""}
                        
                        Output JSON: { "thought": "Brief reasoning...", "prompt": "The detailed prompt..." }
                    `;

                    send("status", "Analyzing sketch semantics...");
                    const planRes = await googleAI.models.generateContent({
                        model: "gemini-3-pro-preview",
                        contents: [{
                            role: "user",
                            parts: [{ text: visionPrompt }, { inlineData: { mimeType: "image/webp", data: base64Data } }]
                        }],
                        config: {
                            responseMimeType: "application/json",
                            thinkingConfig: { thinkingLevel: "high" as any }
                        }
                    });

                    // Capture Thought Signature if available (Mocking/Checking existence)
                    // const thoughtSig = planRes.candidates?.[0]?.thoughtSignature; // API dependent

                    const planJson = JSON.parse(planRes.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
                    const initialPrompt = planJson.prompt || "A photo of a sketch";
                    const initialThought = planJson.thought || "Analyzing shapes...";

                    send("thought", `PLANNING: ${initialThought}`);
                    send("status", "Drafting initial render...");

                    // --- STAGE 2: EXECUTE (Imagen 4 Fast) ---
                    const generateImage = async (prompt: string) => {
                        const predictUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`;
                        const res = await fetch(predictUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                instances: [{ prompt }],
                                parameters: { aspectRatio: "1:1", sampleCount: 1, safetySetting: "block_low_and_above" }
                            })
                        });
                        if (!res.ok) throw new Error("Imagen failed");
                        const data = await res.json();
                        return data.predictions[0]?.bytesBase64Encoded;
                    };

                    let currentImageB64 = await generateImage(initialPrompt);

                    // --- STAGE 3: VERIFY (Gemini 3 Pro) ---
                    send("status", "Verifying output against sketch...");
                    send("thought", "VERIFICATION: Looking at the generated image to check for accuracy...");

                    const verifyPrompt = `
                        Compare the Original Sketch (Image 1) with the Generated Render (Image 2).
                        Did the render capture the intent of the sketch?
                        Rate from 1-10.
                        If < 8, provide a "Fix Prompt" to improve it.
                        Output JSON: { "score": number, "critique": "string", "fixPrompt": "string" }
                    `;

                    const verifyRes = await googleAI.models.generateContent({
                        model: "gemini-3-pro-preview",
                        contents: [{
                            role: "user",
                            parts: [
                                { text: verifyPrompt },
                                { inlineData: { mimeType: "image/webp", data: base64Data } }, // Original
                                { inlineData: { mimeType: "image/png", data: currentImageB64 } } // Generated
                            ]
                        }],
                        config: { responseMimeType: "application/json" }
                    });

                    const verifyJson = JSON.parse(verifyRes.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
                    send("thought", `CRITIQUE: Score ${verifyJson.score}/10. ${verifyJson.critique}`);

                    // --- STAGE 4: CORRECT (Loop if needed) ---
                    if (verifyJson.score < 8) {
                        send("status", "Self-correcting image...");
                        send("thought", `FIXING: Re-generating with feedback: "${verifyJson.fixPrompt}"`);

                        // Combine prompts for better context
                        const improvedPrompt = `${initialPrompt}. Improve: ${verifyJson.fixPrompt}`;
                        currentImageB64 = await generateImage(improvedPrompt);
                        send("thought", "Final polish complete.");
                    } else {
                        send("thought", "Quality verification passed. Perfect match.");
                    }

                    // Send Final Image
                    send("image", `data:image/png;base64,${currentImageB64}`);
                    controller.close();

                } catch (error: any) {
                    send("error", error.message);
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Connection": "keep-alive",
                "Cache-Control": "no-cache",
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: "Generation failed", details: error.message },
            { status: 500 }
        );
    }
}