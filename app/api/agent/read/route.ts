
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        // "Read" mode logic.
        // For the hackathon, "Read" might just mean "Return the text cleaned up for TTS".
        // Or if we had a high-quality TTS API, we would stream audio here.

        // Let's assume we return the same text but maybe split into chunks for easier reading?
        // Or just echo it back with a success flag for the extension to start browser TTS.

        return NextResponse.json({
            message: "Ready to read",
            text: text.substring(0, 5000) // Limit for now
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            }
        });

    } catch (error) {
        return NextResponse.json({ error: "Failed" }, { status: 500 });
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
