import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

function encodeChunk(data: any) {
    return new TextEncoder().encode(JSON.stringify(data) + "\n");
}

export async function POST(req: Request) {
    try {
        const { image, userPrompt, previousImage } = await req.json();

        if (!image || typeof image !== "string") {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API key missing" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const stream = new ReadableStream({
            async start(controller) {
                const send = (
                    type: "status" | "thought" | "image" | "error" | "context", // Updated type
                    content: string
                ) => controller.enqueue(encodeChunk({ type, content }));

                try {
                    /* ---------------- STAGE 1: PLAN ---------------- */
                    // ... (no changes here, implicit)


                    send("status", "Analyzing sketch and intent...");

                    const planRes = await ai.models.generateContent({
                        model: "gemini-3-pro-preview",
                        contents: [{
                            role: "user",
                            parts: [
                                {
                                    text: `
You are an expert Art Director.
Analyze this sketch and produce a high-quality render prompt.

USER HINT: ${userPrompt || "None"}

Output JSON:
{
  "thought": "short reasoning",
  "prompt": "detailed cinematic render prompt"
}`
                                },
                                {
                                    inlineData: {
                                        mimeType: "image/webp",
                                        data: base64Data
                                    }
                                }
                            ]
                        }],
                        config: {
                            responseMimeType: "application/json"
                        }
                    });

                    const planJson = JSON.parse(
                        planRes.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
                    );

                    send("thought", `PLANNING: ${planJson.thought}`);
                    send("status", "Rendering image...");

                    /* ---------------- STAGE 2: IMAGE (NANO BANANA) ---------------- */

                    const imageRes = await ai.models.generateImages({
                        model: "imagen-4.0-fast-generate-001",
                        prompt: planJson.prompt,
                        config: {
                            numberOfImages: 1,
                            aspectRatio: "1:1"
                        }
                    });

                    const imageB64 =
                        imageRes.generatedImages?.[0]?.image?.imageBytes;

                    if (!imageB64) {
                        throw new Error("Image generation failed");
                    }

                    /* ---------------- STAGE 3: VERIFY ---------------- */

                    send("status", "Verifying alignment...");
                    send("thought", "Checking if the render matches the sketch intent.");

                    const verifyRes = await ai.models.generateContent({
                        model: "gemini-3-pro-preview",
                        contents: [{
                            role: "user",
                            parts: [
                                {
                                    text: `
Compare Image 1 (Sketch) and Image 2 (Render).
Rate accuracy 1–10.
If < 8, provide fixPrompt.

Output JSON:
{ "score": number, "critique": string, "fixPrompt": string }
`
                                },
                                {
                                    inlineData: { mimeType: "image/webp", data: base64Data }
                                },
                                {
                                    inlineData: { mimeType: "image/png", data: imageB64 }
                                }
                            ]
                        }],
                        config: { responseMimeType: "application/json" }
                    });

                    const verify = JSON.parse(
                        verifyRes.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
                    );

                    send(
                        "thought",
                        `CRITIQUE: ${verify.score}/10 — ${verify.critique}`
                    );

                    /* ---------------- STAGE 4: SELF-CORRECT ---------------- */

                    let finalImage = imageB64;

                    if (verify.score < 8 && verify.fixPrompt) {
                        send("status", "Applying self-correction...");
                        send("thought", "Refining render based on critique.");

                        const improved = await ai.models.generateImages({
                            model: "imagen-4.0-fast-generate-001",
                            prompt: `${planJson.prompt}. Improve: ${verify.fixPrompt}`,
                            config: { numberOfImages: 1 }
                        });

                        finalImage =
                            improved.generatedImages?.[0]?.image?.imageBytes || imageB64;
                    }

                    /* ---------------- FINAL ---------------- */

                    /* ---------------- FINAL ---------------- */

                    send("image", `data:image/png;base64,${finalImage}`);

                    /* ---------------- STAGE 5: CONTEXTUALIZE ---------------- */
                    send("status", "Generating relevant content...");

                    const contextRes = await ai.models.generateContent({
                        model: "gemini-3-pro-preview",
                        contents: [{
                            role: "user",
                            parts: [{
                                text: `
                                The user created an image based on this intent: "${planJson.prompt}".
                                Determine the most helpful accompanying content.

                                Rules:
                                1. STRICTLY ONLY generate "code" if the image is clearly a UI Interface, Website, or App Mockup.
                                2. If it's a Greeting/Gift Card: Generate a warm, funny, or appropriate message.
                                3. If it's Art, Abstract, or unclear: Generate an inspiring quote or artistic caption.
                                
                                Return JSON:
                                {
                                    "type": "code" | "text",
                                    "content": "the actual code or text"
                                }
                                `
                            }]
                        }],
                        config: { responseMimeType: "application/json" }
                    });

                    const contextData = JSON.parse(
                        contextRes.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
                    );

                    if (contextData.content) {
                        send("context", JSON.stringify(contextData));
                    }

                    controller.close();

                } catch (err: any) {
                    send("error", err.message);
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });

    } catch (err: any) {
        return NextResponse.json(
            { error: "Generation failed", details: err.message },
            { status: 500 }
        );
    }
}
