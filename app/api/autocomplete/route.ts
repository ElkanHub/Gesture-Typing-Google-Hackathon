import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
    try {
        const { context } = await req.json();

        if (!context || context.trim().length < 5) {
            return NextResponse.json({ completion: null });
        }

        const prompt = `
            You are a predictive text engine.
            User's current text: "${context}"
            
            Task: Predict the REST of this sentence (or the next 4-5 words) based on likely intent.
            - Do not repeat the input text.
            - It should flow naturally.
            - Keep it short and common.
            - If the sentence looks complete, return null or empty string.

            Output JSON:
            { "completion": "string" }
        `;

        const response = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            return NextResponse.json({ completion: null });
        }

        return NextResponse.json(json);

    } catch (error) {
        console.error("Autocomplete Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
