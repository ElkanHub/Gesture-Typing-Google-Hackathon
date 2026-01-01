import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
    try {
        const { sequence, trajectory, anchors, candidates, context } = await req.json();

        // Support both architectures (Main App sends trajectory, Extension sends sequence)
        let keySequence = sequence || "";
        let startKey = "";
        let endKey = "";

        if (trajectory && trajectory.length > 0) {
            keySequence = trajectory.map((p: any) => p.key).join('');
            startKey = trajectory[0].key;
            endKey = trajectory[trajectory.length - 1].key;
        } else if (sequence) {
            // Anchor-Based: Derive start/end from sequence string if anchors missing?
            // Ideally anchors are provided.
            startKey = sequence[0];
            endKey = sequence[sequence.length - 1];
        }

        if (!keySequence) {
            return NextResponse.json({ predictions: [] });
        }

        // Use Pre-calculated anchors from the Client
        if (anchors && anchors.length > 0) {
            startKey = anchors[0];
            endKey = anchors[anchors.length - 1];
        }

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
      - ALSO PREDICT THE SINGLE MOST LIKELY *NEXT* WORD (to follow your top prediction) based on common phrases or grammar.
      
      Format:
      { 
        "predictions": ["best_match", "context_match_2", "context_match_3", "alt_1", "alt_2", "alt_3"],
        "next_word": "likely_follow_up_word"
      }
    `;

        const response = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: 'LOW' as any
                }
            }
        });

        const candidatesList = response.candidates;
        let text = "";

        if (candidatesList && candidatesList[0] && candidatesList[0].content && candidatesList[0].content.parts) {
            const parts = candidatesList[0].content.parts;
            // The answer part is the one without 'thought'
            const answerPart = parts.find((p: any) => !p.thought);
            if (answerPart) {
                text = answerPart.text || "";
            } else {
                // Fallback if structure is different
                text = parts[0]?.text || "";
            }

            // Log thoughts for debugging
            const thoughtsPart = parts.find((p: any) => p.thought);
            if (thoughtsPart) {
                console.log("[Gemini 3 Thinking]:", thoughtsPart.text?.substring(0, 100) + "...");
            }
        }

        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON", text);
            return NextResponse.json({ predictions: [] });
        }

        return NextResponse.json(json, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            }
        });

    } catch (error) {
        console.error("Prediction Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
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
