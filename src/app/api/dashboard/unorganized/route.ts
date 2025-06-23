import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // メタデータが不足している素材を検索
    const unorganizedMaterials = await prisma.material.findMany({
      where: {
        OR: [
          // タグがない素材
          {
            tags: {
              none: {},
            },
          },
          // メモがない素材
          {
            OR: [{ memo: null }, { memo: '' }],
          },
          // 場所情報がない素材
          {
            AND: [{ latitude: null }, { longitude: null }, { locationName: null }],
          },
          // レーティングがない素材
          {
            rating: null,
          },
          // 機材情報がない素材
          {
            equipments: {
              none: {},
            },
          },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        recordedAt: true,
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
        memo: true,
        latitude: true,
        longitude: true,
        locationName: true,
        rating: true,
        equipments: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // 各素材の不足している情報を特定
    const materialsWithIssues = unorganizedMaterials.map((material) => {
      const issues: string[] = [];

      if (material.tags.length === 0) {
        issues.push('タグなし');
      }
      if (!material.memo || material.memo.trim() === '') {
        issues.push('メモなし');
      }
      if (!material.latitude && !material.longitude && !material.locationName) {
        issues.push('場所情報なし');
      }
      if (!material.rating) {
        issues.push('レーティングなし');
      }
      if (material.equipments.length === 0) {
        issues.push('機材情報なし');
      }

      return {
        id: material.id,
        slug: material.slug,
        title: material.title,
        recordedAt: material.recordedAt,
        issues,
        // 詳細情報も含める
        tags: material.tags,
        memo: material.memo,
        location: {
          latitude: material.latitude,
          longitude: material.longitude,
          name: material.locationName,
        },
        rating: material.rating,
        equipments: material.equipments,
      };
    });

    // 総数も取得
    const totalCount = await prisma.material.count({
      where: {
        OR: [
          {
            tags: {
              none: {},
            },
          },
          {
            OR: [{ memo: null }, { memo: '' }],
          },
          {
            AND: [{ latitude: null }, { longitude: null }, { locationName: null }],
          },
          {
            rating: null,
          },
          {
            equipments: {
              none: {},
            },
          },
        ],
      },
    });

    return NextResponse.json({
      materials: materialsWithIssues,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error('Error fetching unorganized materials:', error);
    return NextResponse.json({ error: 'Failed to fetch unorganized materials' }, { status: 500 });
  }
}
