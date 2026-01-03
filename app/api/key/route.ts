
import { NextResponse } from 'next/server';

export async function GET() {
    // WARNING: In a real app, never expose API keys like this.
    // This is for the local hackathon prototype only.
    return NextResponse.json({ key: process.env.GEMINI_API_KEY || "" });
}
