import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// eslint-disable-next-line no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const materials = await prisma.material.findMany({
      include: {
        tags: true, // Tag リレーションをインクルード (Categoryはスキーマにないので削除)
        // equipments: true, // 必要であれば機材情報も
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedMaterials = materials.map((material) => ({
      id: material.id,
      title: material.title,
      description: material.memo,       // description -> memo
      recordedDate: material.recordedAt,  // recordedDate -> recordedAt
      categoryName: null,               // categoryName は一旦 null (スキーマにないので)
      tags: material.tags.map(tag => ({ name: tag.name })), // tags は直接マッピング
      filePath: material.filePath,
      // スキーマに存在する他のフィールドも必要に応じて追加
      // fileFormat: material.fileFormat,
      // sampleRate: material.sampleRate,
      // bitDepth: material.bitDepth,
      // latitude: material.latitude,
      // longitude: material.longitude,
      // locationName: material.locationName,
      // rating: material.rating,
    }));

    return NextResponse.json(formattedMaterials);
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
