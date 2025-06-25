import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// E2Eテスト専用のモック音声ファイルエンドポイント
export async function GET() {
  // テスト環境でのみ動作
  if (process.env.NODE_ENV !== 'test' && process.env.E2E_TEST !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // サンプル音声ファイルのパスを構築
  const audioPath = path.join(process.cwd(), 'public', 'uploads', 'hot-spring.wav');

  // ファイルが存在するか確認
  if (!fs.existsSync(audioPath)) {
    // ファイルが存在しない場合は、小さなダミー音声を生成
    const dummyWav = generateDummyWav();

    return new NextResponse(dummyWav, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': dummyWav.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  }

  // 実際のファイルを返す
  const audioBuffer = fs.readFileSync(audioPath);

  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'no-cache',
    },
  });
}

// 最小限のWAVファイルを生成する関数
function generateDummyWav(): Buffer {
  // WAVヘッダー（44バイト）+ 1秒分の無音データ
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = sampleRate * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize - 8;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset);
  offset += 4;
  buffer.writeUInt32LE(fileSize, offset);
  offset += 4;
  buffer.write('WAVE', offset);
  offset += 4;

  // fmt sub-chunk
  buffer.write('fmt ', offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset);
  offset += 4; // Subchunk1Size
  buffer.writeUInt16LE(1, offset);
  offset += 2; // AudioFormat (PCM)
  buffer.writeUInt16LE(numChannels, offset);
  offset += 2;
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), offset);
  offset += 4; // ByteRate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), offset);
  offset += 2; // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, offset);
  offset += 2;

  // data sub-chunk
  buffer.write('data', offset);
  offset += 4;
  buffer.writeUInt32LE(dataSize, offset);
  offset += 4;

  // 無音データ（残りは0で初期化済み）

  return buffer;
}
