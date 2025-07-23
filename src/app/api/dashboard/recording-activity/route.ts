import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // クエリパラメータ
    const days = parseInt(searchParams.get('days') || '365', 10); // デフォルト1年
    const endDateParam = searchParams.get('endDate');

    // 終了日の設定（デフォルトは今日）
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = subDays(endDate, days - 1);

    // 日別録音数を集計
    const materials = await prisma.material.findMany({
      where: {
        recordedAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      select: {
        recordedAt: true,
      },
      orderBy: {
        recordedAt: 'asc',
      },
    });

    // 日別にグループ化
    const activityMap = new Map<string, number>();

    // すべての日を初期化（0で）
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - 1 - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      activityMap.set(dateKey, 0);
    }

    // 実際のデータをカウント
    materials.forEach((material) => {
      const dateKey = format(new Date(material.recordedAt), 'yyyy-MM-dd');
      const currentCount = activityMap.get(dateKey) || 0;
      activityMap.set(dateKey, currentCount + 1);
    });

    // 活動データ配列に変換
    const activities = Array.from(activityMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // 統計情報の計算
    const totalRecordings = materials.length;
    const peakActivity = activities.reduce(
      (peak, activity) => (activity.count > peak.count ? activity : peak),
      { date: '', count: 0 },
    );

    const response = {
      activities,
      totalDays: days,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      totalRecordings,
      peakDay: peakActivity.count > 0 ? peakActivity : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching recording activity:', error);
    return NextResponse.json({ error: 'Failed to fetch recording activity' }, { status: 500 });
  }
}
