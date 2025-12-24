import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { trajectory, context } = await req.json();

        if (!trajectory || trajectory.length === 0) {
            return NextResponse.json({ predictions: [] });
        }

        // 1. Extract the sequence of keys from the trajectory
        // Trajectory is Array<{ key: string, time: number, x, y }>
        const keySequence = trajectory
            .map((p: any) => p.key)
            .join('');

        // 2. Local "Noise Reduction" (Simplified)
        // Collapse adjacent duplicates: "llloooool" -> "lol"
        // But we want to preserve "ll" in "hello"? 
        // Usually gesture engines collapse everything to unique keys sequence, 
        // but time spent on a key matters for double letters.
        // For this prototype, sending the raw stream to Gemini is powerful enough.

        const firstKey = trajectory[0].key;
        const lastKey = trajectory[trajectory.length - 1].key;

        // 3. Construct Prompt
        const prompt = `
      You are a specialized gesture typing decoding engine for physical keyboards.
      
      User Input (Noisy Key Sequence from a swipe): "${keySequence}"
      
      Start Key: ${firstKey}
      End Key: ${lastKey}
      Previous Text Context: "${context || ''}"
      
      Task:
      - Analyze the sequence. The user dragged their finger across these keys.
      - Many keys are unintended intermediates.
      - Infer the most likely intended word.
      - USE THE PREVIOUS CONTEXT to heavily weight words that make sense in the sentence.
      - Return a JSON object with a list of at least 6 predictions.
      - The first 3 should be the most likely based on both gesture shape AND context.
      - The rest should be other plausible words that match the gesture shape.
      
      Format:
      { "predictions": ["best_match", "context_match_2", "context_match_3", "alt_1", "alt_2", "alt_3"] }
    `;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON", text);
            return NextResponse.json({ predictions: [] });
        }

        return NextResponse.json(json);

    } catch (error) {
        console.error("Prediction Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
