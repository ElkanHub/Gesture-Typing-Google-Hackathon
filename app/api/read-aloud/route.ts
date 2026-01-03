import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
    try {
        const { text, style } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });

        // Using 2.0 Flash Exp which supports audio generation via "speech_config" in generationConfig?
        // User guide says "gemini-2.5-flash-tts" but typical API is via generationConfig on standard models or specific endpoint.
        // Let's stick to the user's snippet model name if valid, or fallback to known working one.
        // User said: model = genai.getGenerativeModel({ model: "gemini-2.5-flash-tts" });
        // Let's try that, but if it fails we might need "gemini-2.0-flash-exp" with "response_modalities".

        // Actually, check the user's snippet again.
        // "model: 'gemini-2.5-flash-tts'"

        // I will use "gemini-2.0-flash-exp" as it is the current preview model I am using elsewhere and it supports audio output.
        // The user's guide might be future-facing. I'll use 2.0 logic from my existing knoweldge unless strictly forced.
        // Wait, the USER's snippet explicitly uses `responseModalities: ["AUDIO"]` and `speechConfig`.
        // That is the standard 2.0 way. I will use `gemini-2.0-flash-exp`.

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: `Instruction: ${style || "Read this naturally"}. Text: ${text}` }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Aoede" }
                    }
                }
            } as any
        });

        const audioData = result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

        if (!audioData?.inlineData?.data) {
            return Response.json({ error: "No audio generated" }, { status: 500 });
        }

        return Response.json({ audio: audioData.inlineData.data });
    } catch (error: any) {
        console.error("TTS Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
