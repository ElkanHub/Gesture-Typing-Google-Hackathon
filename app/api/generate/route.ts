import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        // 1. Setup the client
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-3-pro-image-preview" }); // Using 2.0-flash-exp for image gen as 3-pro might not be authed for this key

        // 2. Prepare the base64 data
        const base64Data = image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

        // 3. Generate Content
        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Turn this rough layout into a beautiful, futuristic sci-fi cityscape at sunset. The style should be cinematic and highly detailed." },
                        {
                            inlineData: {
                                mimeType: "image/webp",
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                // responseModalities: ["IMAGE"], // Not supported in current SDK types, inferred from model/prompt
            }
        });

        // 4. Extract Image
        // The structure might vary based on SDK version, but user snippet aligns with recent docs
        const candidates = result.response?.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned");
        }

        const finalPart = candidates[0].content.parts[0];
        if (!finalPart || !finalPart.inlineData) {
            throw new Error("No image data in response");
        }

        const finalImageBase64 = finalPart.inlineData.data;

        // Return as Data URL
        const dataUrl = `data:image/png;base64,${finalImageBase64}`;

        return NextResponse.json({ image: dataUrl });

    } catch (error: any) {
        console.error("Image Gen API Error:", error);
        // Better error logging
        if (error.response) {
            console.error("Upstream Response:", JSON.stringify(error.response, null, 2));
        }
        return NextResponse.json({ error: "Generation Failed", details: error.message }, { status: 500 });
    }
}
