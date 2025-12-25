import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
    try {
        const { shapes } = await req.json();

        if (!shapes || shapes.length === 0) {
            return NextResponse.json({ error: "No shapes provided" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
        You are a digital artist specializing in geometric abstraction and generative art.
        I will provide you with a list of primitive shapes (Line, Circle, Square, Triangle) along with their relative positions (0-1 coordinates) and dimensions.
        
        Your task is to interpret this composition and transform it into a stunning, cohesive SVG artwork.
        - Respect the general layout and relative positions of the shapes.
        - You may stylize the shapes (colors, gradients, strokes, effects, slight deformations) to essentially "hallucinate" a beautiful piece of art from the rough sketch.
        - Use modern color palettes (gradients, neons, pastels, or dark mode aesthetics).
        - The output must be a single raw SVG string.
        - Do not include markdown code block syntax (like \`\`\`svg). Just the <svg> code.
        
        Shapes:
        ${JSON.stringify(shapes, null, 2)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up markdown if present
        let svg = responseText.trim();
        if (svg.startsWith('```svg')) {
            svg = svg.replace(/^```svg/, '').replace(/```$/, '');
        } else if (svg.startsWith('```')) {
            svg = svg.replace(/^```/, '').replace(/```$/, '');
        }

        return NextResponse.json({ svg });

    } catch (error) {
        console.error("Composer Error:", error);
        return NextResponse.json({ error: "Failed to compose art" }, { status: 500 });
    }
}
