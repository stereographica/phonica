import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client'; // Prismaの型をインポート

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

// eslint-disable-next-line no-unused-vars
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
    const body = await request.json();
    const {
      title,
      filePath,
      recordedAt,
      memo,
      tags, // タグ名の配列を期待 (例: ['nature', 'bird'])
      // categoryName, // カテゴリは一旦省略
      fileFormat,
      sampleRate,
      bitDepth,
      latitude,
      longitude,
      locationName,
      rating
    } = body;

    // 簡単なバリデーション
    if (!title || !filePath || !recordedAt) {
      return NextResponse.json(
        { error: "Missing required fields: title, filePath, recordedAt" },
        { status: 400 }
      );
    }

    // slug を title から簡易生成 (実際はより堅牢な方法を推奨)
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // タグの処理: 既存タグへの接続または新規作成して接続
    const tagConnectOrCreate = tags && Array.isArray(tags) ? tags.map((tagName: string) => ({
      where: { name: tagName },
      create: { name: tagName, slug: tagName.toLowerCase().replace(/\s+/g, '-') },
    })) : [];

    const newMaterial = await prisma.material.create({
      data: {
        title,
        slug,
        filePath,
        recordedAt: new Date(recordedAt), // ISO文字列をDateオブジェクトに変換
        memo,
        fileFormat,
        sampleRate: sampleRate ? parseInt(sampleRate) : null,
        bitDepth: bitDepth ? parseInt(bitDepth) : null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        locationName,
        rating: rating ? parseInt(rating) : null,
        tags: {
          connectOrCreate: tagConnectOrCreate,
        },
        // category: categoryName ? { connect: { name: categoryName } } : undefined, // カテゴリ処理が必要な場合
      },
      include: {
        tags: true, // レスポンスに含める
        // category: true,
      },
    });

    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);
    // @ts-expect-error Prismaの型エラーの可能性があるため、一時的に無視
    if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
      return NextResponse.json(
        { error: "Failed to create material: Slug already exists. Please change the title." },
        { status: 409 } // Conflict
      );
    }
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
} 
