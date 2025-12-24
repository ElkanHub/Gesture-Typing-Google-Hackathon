import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { trajectory, anchors, candidates, context } = await req.json();

        if (!trajectory || trajectory.length === 0) {
            return NextResponse.json({ predictions: [] });
        }

        const keySequence = trajectory
            .map((p: any) => p.key)
            .join('');

        // Use Pre-calculated anchors from the Client
        const startKey = trajectory[0].key;
        const endKey = trajectory[trajectory.length - 1].key;

        const anchorInfo = anchors && anchors.length > 0
            ? `High Confidence Keys (Start, Pauses, Turns, End): ${anchors.join(' - ')}`
            : `Start Key: ${startKey}, End Key: ${endKey}`;

        // NEW: Use Candidates from Client Filtering
        let candidateInfo = "";
        if (candidates && candidates.length > 0) {
            candidateInfo = `\nPhysically Valid Word Candidates (Based on keys): [${candidates.join(', ')}]`;
        }

        const prompt = `
      You are a specialized gesture typing decoding engine for physical keyboards.
      
      User Input (Noisy Key Sequence): "${keySequence}"
      ${anchorInfo}
      ${candidateInfo}
      Previous Text Context: "${context || ''}"
      
      CRITICAL HARD CONSTRAINTS:
      1. The predicted word MUST start with the key '${startKey}'.
      2. The predicted word MUST end with the key '${endKey}'.
      3. Do NOT predict words that violate these start/end constraints.
      
      Task:
      - The user dragged their finger across the keys.
      - "Physically Valid Candidates" are words that strictly match the gesture's start/end points and shape.
      - YOUR PRIMARY GOAL is to choose the best word from the "Physically Valid Candidates" list that fits the "Previous Text Context".
      - If none of the candidates fit well, or if the list is empty, infer the most likely intended word from the key sequence and anchors, WHILE OBEYING THE HARD CONSTRAINTS.
      - USE THE CONTEXT to disambiguate (e.g., "I went to" -> "their" vs "there").
      - Return a JSON object with at least 6 predictions.
      - The first 3 should be high-probability matches (prefer candidates that fit context).
      
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
