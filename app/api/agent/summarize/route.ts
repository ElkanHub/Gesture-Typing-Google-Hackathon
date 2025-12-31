import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        console.log("Generating summary for...", text.substring(0, 50));

        // Initialize Gemini
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

        const prompt = `Summarize the following article in a concise, natural, and engaging way for a busy reader. The summary should be readable in 30 seconds. \n\n Article: ${text.substring(0, 20000)}`;

        const response = await genAI.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt
        });

        const summary = response.candidates?.[0]?.content?.parts?.[0]?.text || "Summary unavailable.";

        // TODO: Generate Audio using a TTS service or Gemini's future multimodal capabilities
        // For now, we return the text. The extension uses browser TTS or we can plug in OpenAI TTS here later.

        return NextResponse.json({
            summary,
            // audioUrl: "..." 
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            }
        });

    } catch (error) {
        console.error("Summary Generation Failed:", error);
        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }
}

export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
