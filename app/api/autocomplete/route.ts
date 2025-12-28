import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { context } = await req.json();

        if (!context || context.trim().length < 5) {
            return NextResponse.json({ completion: null });
        }

        // Fast model for latency
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

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
