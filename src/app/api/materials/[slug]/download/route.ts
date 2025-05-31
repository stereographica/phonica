import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import fs, { Stats } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Readable } from 'stream';

const statAsync = promisify(fs.stat);

// 修正: idからslugへ変更
const paramsSchema = z.object({
  slug: z.string().min(1, { message: "Material slug cannot be empty." }), 
});

// Next.js 15.3.3 の新しい型定義
type RouteContext = {
  params: Promise<{ slug: string }>;
}

// TODO: UPLOAD_DIRの定義を見直し、'public' ディレクトリ基準に統一する
// const UPLOAD_DIR = path.resolve(process.env.NEXT_PUBLIC_UPLOAD_DIR || './uploads');
// src/app/api/materials/[slug]/route.ts (PUT) と同様のパス解決ロジックを使用する
const BASE_PUBLIC_DIR = path.join(process.cwd(), 'public');

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const paramsObject = await context.params; // ★ 追加: context.paramsをawaitで解決
    const validatedParams = paramsSchema.safeParse(paramsObject); // paramsObject を使用
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid material slug", details: validatedParams.error.flatten() }, // 修正: エラーメッセージ
        { status: 400 }
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

    // material.filePath は /uploads/materials/filename.ext のような相対パスを想定
    // これを public ディレクトリからの絶対パスに変換する
    const absoluteFilePath = path.join(BASE_PUBLIC_DIR, material.filePath);
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
        return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
      }
      console.error("Error accessing file stats:", err);
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

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    headers.set('Content-Length', fileStats.size.toString());

    return new NextResponse(webStream, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error("Failed to process download request:", error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request parameters", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error instanceof Error) ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
