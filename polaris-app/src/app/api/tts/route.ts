import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log(`[TTS API] OpenAI Key Loaded: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO (or not set)'}`);
console.log(`[TTS API] NOTE: Filesystem caching is disabled for Vercel compatibility.`);

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // Or your specific client domain

export async function POST(req: Request) {
  console.log('[TTS API] Received POST request');
  try {
    const { text } = await req.json();

    if (!text) {
      console.log('[TTS API] Error: Text is required');
      const errorResponse = NextResponse.json({ error: 'Text is required' }, { status: 400 });
      errorResponse.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return errorResponse;
    }

    console.log(`[TTS API] Request for text: ${text.substring(0, 50)}...`);
    console.log(`[TTS API] Generating new audio file via OpenAI (no caching)`);
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    console.log('[TTS API] Successfully generated audio, sending response.');
    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
    response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;

  } catch (error: any) {
    console.error('[TTS API] Error caught:', error);
    if (error.response) {
      console.error('[TTS API] OpenAI Error Response:', error.response.data);
    }
    if (error.message) {
      console.error('[TTS API] Error Message:', error.message);
    }
    const errorResponse = NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
    errorResponse.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return errorResponse;
  }
}

export async function OPTIONS(req: Request) {
  console.log('[TTS API] Received OPTIONS request');
  const response = new NextResponse(null);
  response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
} 