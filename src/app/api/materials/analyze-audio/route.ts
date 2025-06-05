import { NextRequest, NextResponse } from 'next/server';
import { AudioMetadataService } from '@/lib/audio-metadata';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { tempFileId } = body;

    if (!tempFileId) {
      return NextResponse.json({ error: 'tempFileId is required' }, { status: 400 });
    }

    // Analyze audio file
    const audioMetadataService = new AudioMetadataService();

    try {
      const metadata = await audioMetadataService.analyzeAudio(tempFileId);
      return NextResponse.json(metadata);
    } catch (error) {
      if (error instanceof Error && error.message === 'Temporary file not found') {
        return NextResponse.json({ error: 'Temporary file not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Audio analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze audio file' }, { status: 500 });
  }
}
