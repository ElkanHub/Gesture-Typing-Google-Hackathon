import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
    try {
        const { tabContents } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview"
        });

        const prompt = `
    You are a Strategic AI Agent analyzing the user's current digital workspace.
    
    The user has the following tabs open:
    ${JSON.stringify(tabContents, null, 2)}
    
    Your goal is to:
    1.  Synthesize a "Strategic Plan" based on these tabs. Find connections, contradictions, or a path forward for what the user seems to be working on.
    2.  Be insightful. If they have a travel site and a calendar open, sugges scheduling. If they have code and docs, suggest fixes.
    3.  Output a clear, actionable plan.
    
    Output Format:
    Just the plan text, formatted in Markdown.
    `;

        // Enable reasoning if available, or just standard generation
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
            // Note: thinkingConfig might be experimental in this SDK version. 
            // If it fails, remove it. leaving mostly standard for stability.
        });

        const response = result.response;
        const plan = response.text();
        const thoughts = response.candidates?.[0]?.content?.parts?.find((p: any) => p.thought)?.text;

        return Response.json({
            plan,
            thoughts
        });

    } catch (e: any) {
        console.error("Synthesis Failed", e);
        return Response.json({ error: e.message }, { status: 500 });
    }
}
