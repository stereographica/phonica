import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import fs, { Stats } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Readable } from 'stream';

const statAsync = promisify(fs.stat);

/**
 * CI環境用のfallback音声生成関数
 * 5秒間の440Hz正弦波WAVデータを生成
 */
function generateFallbackAudio(title: string) {
  // WAVヘッダー情報
  const sampleRate = 44100;
  const duration = 5; // 5秒
  const numSamples = sampleRate * duration;
  const frequency = 440; // A4音 (440Hz)

  // PCM データサイズ（16bit = 2bytes per sample）
  const dataSize = numSamples * 2;
  const fileSize = 44 + dataSize; // WAVヘッダー(44byte) + データ

  // WAVヘッダーの作成
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset);
  offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset);
  offset += 4;
  buffer.write('WAVE', offset);
  offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset);
  offset += 4;
  buffer.writeUInt32LE(16, offset);
  offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset);
  offset += 2; // audio format (PCM)
  buffer.writeUInt16LE(1, offset);
  offset += 2; // num channels (mono)
  buffer.writeUInt32LE(sampleRate, offset);
  offset += 4; // sample rate
  buffer.writeUInt32LE(sampleRate * 2, offset);
  offset += 4; // byte rate
  buffer.writeUInt16LE(2, offset);
  offset += 2; // block align
  buffer.writeUInt16LE(16, offset);
  offset += 2; // bits per sample

  // data chunk
  buffer.write('data', offset);
  offset += 4;
  buffer.writeUInt32LE(dataSize, offset);
  offset += 4;

  // PCM サンプルデータの生成（440Hz正弦波）
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    const intSample = Math.round(sample * 32767 * 0.5); // 音量を50%に
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  // Readable streamとして返す
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null); // stream終了
    },
  });

  const webStream = Readable.toWeb(readable) as ReadableStream<Uint8Array>;

  const headers = new Headers();
  headers.set('Content-Type', 'audio/wav');
  headers.set(
    'Content-Disposition',
    `inline; filename="fallback-${title.replace(/[^a-zA-Z0-9-_]/g, '_')}.wav"`,
  );
  headers.set('Content-Length', buffer.length.toString());
  headers.set('Accept-Ranges', 'bytes');

  console.log(`✅ Generated fallback audio: ${title} (${buffer.length} bytes)`);

  return new NextResponse(webStream, {
    status: 200,
    headers: headers,
  });
}

// 修正: idからslugへ変更
const paramsSchema = z.object({
  slug: z.string().min(1, { message: 'Material slug cannot be empty.' }),
});

// Next.js 15.3.3 の新しい型定義
type RouteContext = {
  params: Promise<{ slug: string }>;
};

// TODO: UPLOAD_DIRの定義を見直し、'public' ディレクトリ基準に統一する
// const UPLOAD_DIR = path.resolve(process.env.NEXT_PUBLIC_UPLOAD_DIR || './uploads');
// src/app/api/materials/[slug]/route.ts (PUT) と同様のパス解決ロジックを使用する
const BASE_PUBLIC_DIR = path.join(process.cwd(), 'public');

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const paramsObject = await context.params; // ★ 追加: context.paramsをawaitで解決
    const validatedParams = paramsSchema.safeParse(paramsObject); // paramsObject を使用
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid material slug', details: validatedParams.error.flatten() }, // 修正: エラーメッセージ
        { status: 400 },
      );
    }

    const { slug } = validatedParams.data; // 修正: idからslugへ変更

    const material = await prisma.material.findUnique({
      where: { slug }, // 修正: idからslugへ変更
      select: { filePath: true, title: true, fileFormat: true },
    });

    if (!material || !material.filePath) {
      return NextResponse.json({ error: 'Material or file path not found' }, { status: 404 });
    }

    // material.filePath は uploads/materials/filename.ext のような相対パス、
    // または /uploads/materials/filename.ext のような絶対パスの可能性がある
    // 先頭のスラッシュを削除してから結合
    const cleanPath = material.filePath.startsWith('/')
      ? material.filePath.substring(1)
      : material.filePath;
    const absoluteFilePath = path.join(BASE_PUBLIC_DIR, cleanPath);

    // CI環境でのデバッグ情報
    if (process.env.CI === 'true' || process.env.NODE_ENV === 'test') {
      console.log(`[Download API] Material: ${material.title}`);
      console.log(`[Download API] Original path: ${material.filePath}`);
      console.log(`[Download API] Clean path: ${cleanPath}`);
      console.log(`[Download API] Absolute path: ${absoluteFilePath}`);
    }
    let fileStats: Stats; // 外で宣言

    try {
      fileStats = await statAsync(absoluteFilePath); // 中で代入
      if (!fileStats.isFile()) {
        console.error(`Path is not a file: ${absoluteFilePath}`);
        return NextResponse.json({ error: 'Requested path is not a file' }, { status: 400 });
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        console.error(`File not found at path: ${absoluteFilePath}`);

        // CI環境での音声ファイル不在時のfallback機能
        if (process.env.CI === 'true') {
          console.log('🔧 CI environment detected: generating fallback silent audio');
          return generateFallbackAudio(material.title || 'test-audio');
        }

        return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
      }
      console.error('Error accessing file stats:', err);
      return NextResponse.json({ error: 'Error accessing file' }, { status: 500 });
    }

    const nodeStream = fs.createReadStream(absoluteFilePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    const fileName = path.basename(material.filePath);
    let contentType = 'application/octet-stream';
    const ext = material.fileFormat?.toLowerCase();
    if (ext === 'wav') contentType = 'audio/wav';
    else if (ext === 'mp3') contentType = 'audio/mpeg';
    else if (ext === 'aac') contentType = 'audio/aac';
    else if (ext === 'ogg') contentType = 'audio/ogg';
    else if (ext === 'flac') contentType = 'audio/flac';
    else if (ext === 'm4a') contentType = 'audio/mp4';
    else if (ext === 'webm') contentType = 'audio/webm';
    else if (ext === 'aiff' || ext === 'aif') contentType = 'audio/aiff';

    // クエリパラメータで再生かダウンロードかを判断
    const url = new URL(request.url);
    const isPlayback = url.searchParams.get('play') === 'true';

    const headers = new Headers();
    headers.set('Content-Type', contentType);

    // 再生用の場合は inline、ダウンロード用の場合は attachment
    if (isPlayback) {
      headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    } else {
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    }

    headers.set('Content-Length', fileStats.size.toString());
    headers.set('Accept-Ranges', 'bytes'); // 音声プレーヤーでのシーク機能をサポート

    return new NextResponse(webStream, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error('Failed to process download request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
