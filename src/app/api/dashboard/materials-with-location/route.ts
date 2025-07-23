import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // クエリパラメータ
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 100); // 最大100件
    const boundsParam = searchParams.get('bounds'); // 地図の表示範囲（オプション）

    // 境界条件の解析（north,south,east,west形式）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let whereClause: any = {
      AND: [{ latitude: { not: null } }, { longitude: { not: null } }],
    };

    if (boundsParam) {
      try {
        const [north, south, east, west] = boundsParam.split(',').map(Number);
        whereClause = {
          AND: [
            {
              AND: [
                { latitude: { not: null } },
                { latitude: { gte: south } },
                { latitude: { lte: north } },
              ],
            },
            {
              AND: [
                { longitude: { not: null } },
                { longitude: { gte: west } },
                { longitude: { lte: east } },
              ],
            },
          ],
        };
      } catch {
        console.warn('Invalid bounds parameter:', boundsParam);
        // 無効な境界パラメータの場合はデフォルトの条件を使用
      }
    }

    // 位置情報付き素材を取得
    const materials = await prisma.material.findMany({
      where: whereClause,
      select: {
        id: true,
        slug: true,
        title: true,
        latitude: true,
        longitude: true,
        locationName: true,
        recordedAt: true,
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: limit,
    });

    // 総数を取得
    const totalCount = await prisma.material.count({
      where: whereClause,
    });

    // 境界と中心点の計算
    let bounds = null;
    let center = null;

    if (materials.length > 0) {
      const latitudes = materials.map((m) => m.latitude!);
      const longitudes = materials.map((m) => m.longitude!);

      const north = Math.max(...latitudes);
      const south = Math.min(...latitudes);
      const east = Math.max(...longitudes);
      const west = Math.min(...longitudes);

      bounds = { north, south, east, west };
      center = {
        lat: (north + south) / 2,
        lng: (east + west) / 2,
      };
    }

    // レスポンス用データの整形
    const formattedMaterials = materials.map((material) => ({
      id: material.id,
      slug: material.slug,
      title: material.title,
      latitude: material.latitude!,
      longitude: material.longitude!,
      recordedAt: material.recordedAt.toISOString(),
      location: material.locationName,
    }));

    const response = {
      materials: formattedMaterials,
      totalCount,
      bounds,
      center,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching materials with location:', error);
    return NextResponse.json({ error: 'Failed to fetch materials with location' }, { status: 500 });
  }
}
