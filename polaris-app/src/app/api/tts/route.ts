import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create audio directory if it doesn't exist
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function generateHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

async function getAudioPath(text: string): Promise<string> {
  const hash = generateHash(text);
  return path.join(AUDIO_DIR, `${hash}.mp3`);
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const audioPath = await getAudioPath(text);
    console.log(`[TTS API] Request for text: ${text.substring(0, 50)}...`);
    console.log(`[TTS API] Audio path: ${audioPath}`);
    
    // Check if audio file already exists
    if (fs.existsSync(audioPath)) {
      console.log(`[TTS API] Using cached audio file`);
      const audioBuffer = fs.readFileSync(audioPath);
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'X-Cache': 'HIT',  // Add cache header
        },
      });
    }

    console.log(`[TTS API] Generating new audio file`);
    // Generate new audio if it doesn't exist
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // Save the audio file
    fs.writeFileSync(audioPath, buffer);
    console.log(`[TTS API] Saved new audio file`);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'X-Cache': 'MISS',  // Add cache header
      },
    });
  } catch (error) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
} 