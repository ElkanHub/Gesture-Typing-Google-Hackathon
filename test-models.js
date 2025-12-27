
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error("No API KEY found");
            return;
        }
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log("Fetching available models...");
        const response = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; // Just to init? No, need listModels on the class or similar?
        // Actually the SDK might not expose listModels directly on the instance easily in all versions.
        // Let's rely on the SDK documentation pattern if possible.
        // Wait, standard SDK has `genAI.getGenerativeModel` but listing might require a different call.
        // Let's try to just output what we can guess or try a known image model.

        // Actually, let's try to Instantiate 'imagen-3.0-generate-001' and generate 1 pixel to see if it throws 'Not Found' or '400'.

        const imageModel = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
        try {
            console.log("Testing text-to-image with 'imagen-3.0-generate-001'...");
            const res = await imageModel.generateContent("A single red pixel");
            console.log("Success with imagen-3.0-generate-001");
        } catch (e) {
            console.log("Failed 'imagen-3.0-generate-001':", e.message.split('\n')[0]);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

listModels();
