import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

// 検索クエリパラメータのバリデーションスキーマ
const SearchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  type: z.enum(['all', 'materials', 'tags', 'equipment']).optional().default('all'),
});

// スコアリング用の型定義
interface MaterialWithRelations {
  title: string;
  memo: string | null;
  locationName: string | null;
  tags?: Array<{ name: string }>;
  equipments?: Array<{ name: string }>;
}

interface TagEntity {
  name: string;
}

interface EquipmentEntity {
  name: string;
  manufacturer: string | null;
  memo: string | null;
}

// スコアリング関数
function calculateMaterialScore(material: MaterialWithRelations, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTitle = material.title.toLowerCase();

  // タイトルの完全一致
  if (lowerTitle === lowerQuery) {
    return 100;
  }

  // タイトルの部分一致
  if (lowerTitle.includes(lowerQuery)) {
    return 80;
  }

  // タグ名の一致
  if (material.tags?.some((tag) => tag.name.toLowerCase().includes(lowerQuery))) {
    return 60;
  }

  // メモまたは場所名の一致
  if (
    (material.memo && material.memo.toLowerCase().includes(lowerQuery)) ||
    (material.locationName && material.locationName.toLowerCase().includes(lowerQuery))
  ) {
    return 40;
  }

  // 機材名の一致
  if (material.equipments?.some((eq) => eq.name.toLowerCase().includes(lowerQuery))) {
    return 40;
  }

  return 20; // デフォルトスコア（何らかの理由でヒットした場合）
}

function calculateTagScore(tag: TagEntity, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerName = tag.name.toLowerCase();

  // 名前の完全一致
  if (lowerName === lowerQuery) {
    return 100;
  }

  // 名前の部分一致
  if (lowerName.includes(lowerQuery)) {
    return 80;
  }

  return 20;
}

function calculateEquipmentScore(equipment: EquipmentEntity, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerName = equipment.name.toLowerCase();

  // 名前の完全一致
  if (lowerName === lowerQuery) {
    return 100;
  }

  // 名前の部分一致
  if (lowerName.includes(lowerQuery)) {
    return 80;
  }

  // メーカー名またはメモの一致
  if (
    (equipment.manufacturer && equipment.manufacturer.toLowerCase().includes(lowerQuery)) ||
    (equipment.memo && equipment.memo.toLowerCase().includes(lowerQuery))
  ) {
    return 40;
  }

  return 20;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    // クエリパラメータが存在しない場合のチェック
    if (!queryParams.q || queryParams.q.trim() === '') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const validationResult = SearchQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { q, page, limit, type } = validationResult.data;
    const skip = (page - 1) * limit;

    // 検索結果を格納するオブジェクト
    interface SearchResultItem {
      materials?: Array<{
        id: string;
        title: string;
        filePath: string;
        recordedAt: Date;
        memo: string | null;
        tags: Array<{ id: string; name: string; slug: string }>;
        equipments: Array<{ id: string; name: string; type: string }>;
        fileFormat: string | null;
        sampleRate: number | null;
        bitDepth: number | null;
        durationSeconds: number | null;
        channels: number | null;
        latitude: number | null;
        longitude: number | null;
        locationName: string | null;
        rating: number | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        score?: number;
      }>;
      tags?: Array<{
        id: string;
        name: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        _count: { materials: number };
        score?: number;
      }>;
      equipment?: Array<{
        id: string;
        name: string;
        type: string;
        manufacturer: string | null;
        memo: string | null;
        createdAt: Date;
        updatedAt: Date;
        score?: number;
      }>;
    }

    const searchResult: SearchResultItem = {};

    let totalItems = 0;

    // 素材の検索
    if (type === 'all' || type === 'materials') {
      const materialWhere: Prisma.MaterialWhereInput = {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { memo: { contains: q, mode: 'insensitive' } },
          { locationName: { contains: q, mode: 'insensitive' } },
          {
            tags: {
              some: {
                name: { contains: q, mode: 'insensitive' },
              },
            },
          },
          {
            equipments: {
              some: {
                name: { contains: q, mode: 'insensitive' },
              },
            },
          },
        ],
      };

      const [materials, materialCount] = await Promise.all([
        prisma.material.findMany({
          where: materialWhere,
          skip: type === 'materials' ? skip : 0,
          take: type === 'materials' ? limit : undefined,
          include: {
            tags: true,
            equipments: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.material.count({ where: materialWhere }),
      ]);

      searchResult.materials = materials
        .map((material) => ({
          id: material.id,
          title: material.title,
          filePath: material.filePath,
          recordedAt: material.recordedAt,
          memo: material.memo,
          tags: material.tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
          equipments: material.equipments.map((e) => ({ id: e.id, name: e.name, type: e.type })),
          fileFormat: material.fileFormat,
          sampleRate: material.sampleRate,
          bitDepth: material.bitDepth,
          durationSeconds: material.durationSeconds,
          channels: material.channels,
          latitude: material.latitude,
          longitude: material.longitude,
          locationName: material.locationName,
          rating: material.rating,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
          slug: material.slug,
          score: calculateMaterialScore(material, q),
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0)); // スコア順にソート

      totalItems += materialCount;
    }

    // タグの検索
    if (type === 'all' || type === 'tags') {
      const tagWhere: Prisma.TagWhereInput = {
        name: { contains: q, mode: 'insensitive' },
      };

      const [tags, tagCount] = await Promise.all([
        prisma.tag.findMany({
          where: tagWhere,
          skip: type === 'tags' ? skip : 0,
          take: type === 'tags' ? limit : undefined,
          include: {
            _count: {
              select: { materials: true },
            },
          },
          orderBy: {
            name: 'asc',
          },
        }),
        prisma.tag.count({ where: tagWhere }),
      ]);

      searchResult.tags = tags
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          createdAt: tag.createdAt,
          updatedAt: tag.updatedAt,
          _count: tag._count,
          score: calculateTagScore(tag, q),
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0)); // スコア順にソート

      totalItems += tagCount;
    }

    // 機材の検索
    if (type === 'all' || type === 'equipment') {
      const equipmentWhere: Prisma.EquipmentWhereInput = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { manufacturer: { contains: q, mode: 'insensitive' } },
          { memo: { contains: q, mode: 'insensitive' } },
        ],
      };

      const [equipment, equipmentCount] = await Promise.all([
        prisma.equipment.findMany({
          where: equipmentWhere,
          skip: type === 'equipment' ? skip : 0,
          take: type === 'equipment' ? limit : undefined,
          orderBy: {
            name: 'asc',
          },
        }),
        prisma.equipment.count({ where: equipmentWhere }),
      ]);

      searchResult.equipment = equipment
        .map((eq) => ({
          ...eq,
          score: calculateEquipmentScore(eq, q),
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0)); // スコア順にソート

      totalItems += equipmentCount;
    }

    // ページネーション情報の計算
    const totalPages =
      type === 'all'
        ? 1 // type=allの場合はページネーションなし
        : Math.ceil(totalItems / limit);

    return NextResponse.json({
      query: q,
      data: searchResult,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems,
      },
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 });
  }
}
