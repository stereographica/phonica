import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 総素材数を取得
    const totalCount = await prisma.material.count();

    if (totalCount === 0) {
      return NextResponse.json({ material: null });
    }

    // ランダムなオフセットを生成
    const randomOffset = Math.floor(Math.random() * totalCount);

    // ランダムな素材を1つ取得
    const randomMaterial = await prisma.material.findMany({
      skip: randomOffset,
      take: 1,
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        equipments: {
          select: {
            id: true,
            name: true,
            type: true,
            manufacturer: true,
          },
        },
      },
    });

    if (randomMaterial.length === 0) {
      return NextResponse.json({ material: null });
    }

    const material = randomMaterial[0];

    // 波形データの生成（仮実装 - 実際にはaudio-metadataサービスを使用）
    const generateDummyPeaks = (duration: number): number[] => {
      const peaksCount = Math.min(duration * 10, 1000); // 10 peaks per second, max 1000
      const peaks: number[] = [];

      for (let i = 0; i < peaksCount; i++) {
        // より自然な波形パターンを生成
        const base = Math.sin(i * 0.1) * 0.3 + 0.5;
        const noise = (Math.random() - 0.5) * 0.4;
        peaks.push(Math.max(0, Math.min(1, base + noise)));
      }

      return peaks;
    };

    const peaks = material.durationSeconds ? generateDummyPeaks(material.durationSeconds) : [];

    // レスポンスデータの構築
    const response = {
      material: {
        id: material.id,
        slug: material.slug,
        title: material.title,
        filePath: material.filePath,
        fileFormat: material.fileFormat,
        sampleRate: material.sampleRate,
        bitDepth: material.bitDepth,
        durationSeconds: material.durationSeconds,
        channels: material.channels,
        recordedAt: material.recordedAt,
        location: {
          latitude: material.latitude,
          longitude: material.longitude,
          name: material.locationName,
        },
        memo: material.memo,
        rating: material.rating,
        tags: material.tags,
        projects: material.projects,
        equipments: material.equipments,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
        // 音声再生用の追加データ
        audioUrl: `/api/materials/${material.slug}/download`, // ダウンロードエンドポイントを使用
        peaks, // 波形データ
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching random material:', error);
    return NextResponse.json({ error: 'Failed to fetch random material' }, { status: 500 });
  }
}
