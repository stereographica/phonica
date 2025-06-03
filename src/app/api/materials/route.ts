import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client'; // Prismaの型をインポート
import { v4 as uuidv4 } from 'uuid'; // uuid をインポート
import path from 'path'; // path をインポート
import fs from 'fs/promises'; // fs.promises をインポート

// slugify関数を再定義
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
}

// クエリパラメータのバリデーションスキーマ
const GetMaterialsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  title: z.string().optional(), // タイトルによるフィルタリング
  tag: z.string().optional(), // 特定のタグ名によるフィルタリング
  // 必要に応じて他のフィルター条件を追加 (例: fileFormat, recordedAtRangeなど)
});

 
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    const validationResult = GetMaterialsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, title, tag } = validationResult.data;

    const skip = (page - 1) * limit;

    // Prismaの検索条件を構築
    const where: Prisma.MaterialWhereInput = {}; // 型を Prisma.MaterialWhereInput に変更
    if (title) {
      where.title = {
        contains: title,
        mode: 'insensitive', // 大文字・小文字を区別しない
      };
    }
    if (tag) {
      where.tags = {
        some: {
          name: tag,
        },
      };
    }

    // Prismaのソート条件を構築
    const orderBy: Prisma.MaterialOrderByWithRelationInput = {}; // 型を Prisma.MaterialOrderByWithRelationInput に変更
    // 許可するソートキーを定義 (セキュリティのため)
    const allowedSortKeys: Array<keyof Prisma.MaterialOrderByWithRelationInput> = [
        'title', 'createdAt', 'recordedAt', 'rating', 'fileFormat', 'sampleRate', 'bitDepth'
    ];
    
    if (allowedSortKeys.includes(sortBy as keyof Prisma.MaterialOrderByWithRelationInput)) {
        orderBy[sortBy as keyof Prisma.MaterialOrderByWithRelationInput] = sortOrder;
    } else {
        orderBy['createdAt'] = sortOrder; // デフォルトはcreatedAtでソート
    }


    const materials = await prisma.material.findMany({
      where,
      skip,
      take: limit,
      include: {
        tags: true,
        equipments: true, // 機材情報も取得
      },
      orderBy,
    });

    const totalMaterials = await prisma.material.count({ where });
    const totalPages = Math.ceil(totalMaterials / limit);

    // APIレスポンスの形式を調整 (現状のテストに合わせて一部フィールド名を変更)
    const formattedMaterials = materials.map((material) => ({
      id: material.id,
      title: material.title,
      filePath: material.filePath,
      recordedAt: material.recordedAt,
      memo: material.memo, // description から memo に合わせる
      tags: material.tags.map(t => ({ id: t.id, name: t.name, slug: t.slug })), // slugも追加
      equipments: material.equipments.map(e => ({id: e.id, name: e.name, type: e.type})),
      fileFormat: material.fileFormat,
      sampleRate: material.sampleRate,
      bitDepth: material.bitDepth,
      latitude: material.latitude,
      longitude: material.longitude,
      locationName: material.locationName,
      rating: material.rating,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      slug: material.slug,
      // categoryName はスキーマにないので削除
    }));


    return NextResponse.json({
      data: formattedMaterials,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: totalMaterials,
      },
    });
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

// 新しい素材を登録するPOST処理
export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    let file: File | null = null;
    let title: string | null = null;
    let recordedAt: string | null = null;
    let memo: string | null = null;
    let tagsStr: string | null = null;
    let fileFormat: string | null = null;
    let sampleRateStr: string | null = null;
    let bitDepthStr: string | null = null;
    let latitudeStr: string | null = null;
    let longitudeStr: string | null = null;
    let locationName: string | null = null;
    let ratingStr: string | null = null;
    let equipmentsStr: string | null = null;

    // FormDataのパースを試みる
    try {
      // Content-Typeヘッダーをチェック
      const contentType = request.headers.get('content-type') || '';
      
      // FormDataのパースを試みる前に、ヘッダーのバリデーション
      if (!contentType.includes('multipart/form-data')) {
        return NextResponse.json(
          { error: "Invalid content type. Expected multipart/form-data." },
          { status: 400 }
        );
      }
      
      // Firefox/WebKitの場合、FormDataのパースに問題があることがあるため、
      // 一度クローンしてからパースを試みる
      // 将来の実装のためにコメントアウト
      // const clonedRequest = request.clone();
      
      try {
        formData = await request.formData();
      } catch (initialError) {
        console.warn('Initial FormData parse failed, trying alternative method:', initialError);
        // 代替方法: バイトデータを直接読み取って手動でパース（将来の実装用）
        // 現時点では、エラーを返す
        throw initialError;
      }
      
      file = formData.get('file') as File | null;
      title = formData.get('title') as string | null;
      recordedAt = formData.get('recordedAt') as string | null;
      memo = formData.get('memo') as string | null;
      tagsStr = formData.get('tags') as string | null;
      fileFormat = formData.get('fileFormat') as string | null;
      sampleRateStr = formData.get('sampleRate') as string | null;
      bitDepthStr = formData.get('bitDepth') as string | null;
      latitudeStr = formData.get('latitude') as string | null;
      longitudeStr = formData.get('longitude') as string | null;
      locationName = formData.get('locationName') as string | null;
      ratingStr = formData.get('rating') as string | null;
      equipmentsStr = formData.get('equipmentIds') as string | null;
    } catch (formDataError) {
      console.error('FormData parse error:', formDataError);
      
      // Firefox/WebKitでのFormDataパースエラーの回避策
      // サーバーアクションを使用することを推奨
      return NextResponse.json(
        { 
          error: "Failed to parse form data. This is a known issue with Firefox/WebKit. Please use the server action method or try using Chrome.",
          details: formDataError instanceof Error ? formDataError.message : String(formDataError),
          recommendation: "The application now uses server actions by default which should work across all browsers."
        },
        { status: 400 }
      );
    }

    if (!title || !recordedAt || !file) {
      return NextResponse.json(
        { error: "Missing required fields: title, recordedAt, and file" },
        { status: 400 }
      );
    }

    const fileExtension = path.extname(file.name);
    // テスト環境の場合はファイル名にプレフィックスを付ける
    const fileNamePrefix = process.env.NODE_ENV === 'test' ? 'test-dummy-' : '';
    const uniqueFileName = `${fileNamePrefix}${uuidv4()}${fileExtension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
    const filePathInFilesystem = path.join(uploadDir, uniqueFileName);
    await fs.mkdir(uploadDir, { recursive: true });
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePathInFilesystem, fileBuffer);
    const filePathForDb = `/uploads/materials/${uniqueFileName}`;

    // タイムスタンプを追加してslugをユニークにする
    const timestamp = Date.now();
    const slug = `${slugify(title)}-${timestamp}`;

    const tagsToConnect = tagsStr
      ? await Promise.all(
          tagsStr.split(',').map(async (tagName) => {
            const trimmedName = tagName.trim();
            return {
              where: { name: trimmedName },
              create: { name: trimmedName, slug: slugify(trimmedName) },
            };
          })
        )
      : [];

    // 機材IDの検証と接続処理
    let equipmentsToConnect: { id: string }[] = [];
    if (equipmentsStr) {
      const equipmentIds = equipmentsStr.split(',').map(id => id.trim()).filter(id => id);
      
      // 存在する機材IDを検証
      const existingEquipments = await prisma.equipment.findMany({
        where: {
          id: { in: equipmentIds }
        }
      });
      
      // 存在しないIDをチェック
      const existingIds = existingEquipments.map(e => e.id);
      const invalidIds = equipmentIds.filter(id => !existingIds.includes(id));
      
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid equipment IDs: ${invalidIds.join(', ')}` },
          { status: 400 }
        );
      }
      
      equipmentsToConnect = equipmentIds.map(id => ({ id }));
    }

    const newMaterial = await prisma.material.create({
      data: {
        title,
        slug,
        filePath: filePathForDb,
        recordedAt: new Date(recordedAt),
        memo: (memo === "null" || memo === "") ? null : memo,
        fileFormat: (fileFormat === "null" || fileFormat === "") ? null : fileFormat,
        sampleRate: sampleRateStr ? parseInt(sampleRateStr) : null,
        bitDepth: bitDepthStr ? parseInt(bitDepthStr) : null,
        latitude: latitudeStr ? (parseFloat(latitudeStr) || null) : null,
        longitude: longitudeStr ? (parseFloat(longitudeStr) || null) : null,
        locationName: (locationName === "null" || locationName === "") ? null : locationName,
        rating: ratingStr ? parseInt(ratingStr) : null,
        tags: { connectOrCreate: tagsToConnect },
        equipments: { 
          connect: equipmentsToConnect 
        },
      },
      include: { tags: true, equipments: true },
    });

    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating material:", error);
    
    // より詳細なエラー情報をログに記録
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
    }
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002' && 
        'meta' in error && error.meta && typeof error.meta === 'object' && 'target' in error.meta &&
        Array.isArray(error.meta.target) && error.meta.target.includes('slug')) {
      return NextResponse.json(
        { error: "Failed to create material: Slug already exists. Please change the title." },
        { status: 409 }
      );
    }
    
    // 開発環境では詳細なエラー情報を返す
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json(
        { 
          error: "Failed to create material",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
} 



