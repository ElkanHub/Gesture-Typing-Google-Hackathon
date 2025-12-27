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
                            You are a digital master artist specializing in Hyper-Realistic Vector Art.

TASK:
Transform the provided sketches/shapes into a PHOTOREALISTIC, FULL-SCENE illustration using SVG.
The output must be indistinguishable from a high-quality flat vector illustration found on Dribbble or Behance.

CRITICAL STYLE INSTRUCTIONS:
1. **NO OUTLINES/STROKES**: Do NOT use black strokes around shapes. Use filled shapes only. This is crucial for avoiding the "MS Paint" look.
2. **COMPLEX GRADIENTS**: Use <linearGradient> and <radialGradient> extensively to create 3D volume, lighting, and shading.
3. **DEPTH & ATMOSPHERE**: Use multiple layers with varying opacity to create atmospheric perspective (fog, depth of field).
4. **TEXTURE**: Use SVG filters (like feTurbulence or feGaussianBlur) to add subtle texture and avoid "plastic" smoothness.
5. **FULL COMPOSITION**: Identify the subject (e.g., dog) and place it in a COMPLETE detailed environment (bg, lighting, shadows).

INTERPRETATION:
- Interpret the input shapes as a rough block-out.
- If it looks like a dog, draw a highly detailed, realistic dog.
- Adjust the geometry to be anatomically/structurally correct while respecting the pose.

OUTPUT FORMAT:
- Return ONLY the raw \`<svg>\` code.
- The SVG must define a \`viewBox\`.
- Use a high resolution viewBox (e.g., 0 0 1024 1024).
- Do NOT wrap in markdown code blocks.
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
