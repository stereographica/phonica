import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths, format } from 'date-fns';

export async function GET() {
  try {
    // 総素材数
    const totalMaterials = await prisma.material.count();

    // 総録音時間（秒）
    const totalDurationResult = await prisma.material.aggregate({
      _sum: {
        durationSeconds: true,
      },
    });
    const totalDuration = totalDurationResult._sum.durationSeconds || 0;

    // 平均レーティング
    const avgRatingResult = await prisma.material.aggregate({
      _avg: {
        rating: true,
      },
    });
    const averageRating = avgRatingResult._avg.rating || 0;

    // タグ別素材数
    const tagStats = await prisma.tag.findMany({
      select: {
        name: true,
        _count: {
          select: {
            materials: true,
          },
        },
      },
      orderBy: {
        materials: {
          _count: 'desc',
        },
      },
      take: 10, // 上位10タグ
    });

    const tagData = tagStats.map((tag) => ({
      name: tag.name,
      count: tag._count.materials,
    }));

    // 月別録音数（過去6ヶ月）
    const monthlyData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));

      const count = await prisma.material.count({
        where: {
          recordedAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      monthlyData.push({
        month: format(monthStart, 'M月'),
        count,
      });
    }

    // 機材別使用頻度
    const equipmentStats = await prisma.equipment.findMany({
      select: {
        name: true,
        _count: {
          select: {
            materials: true,
          },
        },
      },
      orderBy: {
        materials: {
          _count: 'desc',
        },
      },
      take: 10, // 上位10機材
    });

    const equipmentData = equipmentStats.map((equipment) => ({
      name: equipment.name,
      count: equipment._count.materials,
    }));

    // 場所情報のある素材数
    const materialsWithLocation = await prisma.material.count({
      where: {
        AND: [{ latitude: { not: null } }, { longitude: { not: null } }],
      },
    });

    // レスポンスデータの構築
    const stats = {
      summary: {
        totalMaterials,
        totalDuration: Math.round(totalDuration / 60), // 分に変換
        averageRating: Math.round(averageRating * 10) / 10, // 小数点1位まで
        materialsWithLocation,
      },
      tagData,
      monthlyData,
      equipmentData,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics' }, { status: 500 });
  }
}
