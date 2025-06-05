import { NextRequest, NextResponse } from 'next/server';
import { AudioMetadataService } from '@/lib/audio-metadata';

const ALLOWED_AUDIO_TYPES = [
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/flac',
  'audio/ogg',
  'audio/webm',
  'audio/aiff',
  'audio/x-aiff',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio file.' },
        { status: 400 },
      );
    }

    // Save file to temporary storage
    const audioMetadataService = new AudioMetadataService();
    const tempFileId = await audioMetadataService.saveTempFile(file);

    return NextResponse.json({
      tempFileId,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
