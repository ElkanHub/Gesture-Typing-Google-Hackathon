import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { trajectory, anchors, context } = await req.json();

        if (!trajectory || trajectory.length === 0) {
            return NextResponse.json({ predictions: [] });
        }

        const keySequence = trajectory
            .map((p: any) => p.key)
            .join('');

        // Use Pre-calculated anchors from the client "Local Refining Layer" (Dwell/Inflection)
        const anchorInfo = anchors && anchors.length > 0
            ? `High Confidence Keys (Start, Pauses, Turns, End): ${anchors.join(' - ')}`
            : `Start Key: ${trajectory[0].key}, End Key: ${trajectory[trajectory.length - 1].key}`;

        const prompt = `
      You are a specialized gesture typing decoding engine for physical keyboards.
      
      User Input (Noisy Key Sequence): "${keySequence}"
      ${anchorInfo}
      Previous Text Context: "${context || ''}"
      
      Task:
      - The user dragged their finger across these keys.
      - The "High Confidence Keys" represent dwell points (pauses) or inflection points (turns). These keys MUST be present in the target word, roughly in that order.
      - Keys between anchors are likely noise, but can provide hints.
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
