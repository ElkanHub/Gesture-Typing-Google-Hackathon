import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image || typeof image !== "string") {
            return NextResponse.json(
                { error: "No image provided or invalid format" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key missing" },
                { status: 500 }
            );
        }

        // --- Initialize Gemini ---
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // --- Extract base64 safely ---
        const base64Data = image.replace(
            /^data:image\/(png|jpeg|jpg|webp);base64,/,
            ""
        );

        // --- Generate content ---
        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `
                            You are a digital master artist specializing in Realism.

TASK:
Transform the provided rough sketch into a FULLY REALIZED, RECTANGULAR illustration using SVG.
The output must look like a complete picture, NOT just floating shapes.

CRITICAL INSTRUCTIONS:
1. **INTERPRETATION**: detailed scene based on the shapes (e.g., if it looks like a dog, draw a realistic dog in a park).
2. **BACKGROUND**: You MUST fill the entire SVG 100% with a background scene (sky, ground, room, etc.). No transparent or white void.
3. **STYLE**: "Realism" or "Design with Lighting". Use gradients, shadows, and filters to achieve depth.
4. **COMPOSITION**: Respect the relative positions of the input shapes, but fully flesh them out into real objects.

OUTPUT FORMAT:
- Return ONLY the raw \`<svg>\` code.
- The SVG must define a \`viewBox\`.
- Do NOT wrap in markdown code blocks.
- Do NOT add any conversational text.
                            `
                        },
                        {
                            inlineData: {
                                mimeType: "image/webp",
                                data: base64Data
                            }
                        }
                    ]
                }
            ]
        });

        const response = result.response;
        console.log("Gemini Response Candidates:", JSON.stringify(response.candidates, null, 2));

        if (!response?.candidates || response.candidates.length === 0) {
            throw new Error("No candidates returned by Gemini");
        }

        // --- Extract SVG Code ---
        const candidate = response.candidates[0];
        const textPart = candidate.content?.parts.find(p => p.text);

        if (!textPart || !textPart.text) {
            throw new Error("No text content generated (SVG code missing)");
        }

        let svgCode = textPart.text.trim();

        // Clean Markdown if present
        if (svgCode.startsWith("```")) {
            svgCode = svgCode.replace(/^```(svg|xml)?/i, "").replace(/```$/, "").trim();
        }

        // Basic verification
        if (!svgCode.includes("<svg") || !svgCode.includes("</svg>")) {
            throw new Error("Generated content is not a valid SVG");
        }

        // Encode to Data URL
        const base64Svg = Buffer.from(svgCode).toString("base64");
        const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

        return NextResponse.json({
            image: dataUrl
        });

    } catch (error: any) {
        console.error("Gemini Image Route Error:", error);
        return NextResponse.json(
            {
                error: "Image generation failed",
                details: error.message ?? "Unknown error"
            },
            { status: 500 }
        );
    }
}
