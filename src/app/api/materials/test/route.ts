import { NextRequest, NextResponse } from 'next/server';
import { createMaterialForTest } from '@/lib/actions/materials';
import { prisma } from '@/lib/prisma';

// E2Eテスト用のダミー素材データ
const testMaterialData = {
  id: 'test-material-id',
  slug: 'test',
  title: 'Test Material',
  description: null,
  recordedDate: new Date().toISOString(),
  categoryName: null,
  tags: [],
  filePath: '/test/path.wav',
  fileFormat: 'WAV',
  sampleRate: 48000,
  bitDepth: 24,
  durationSeconds: 120,
  channels: 2,
  latitude: 35.6762,
  longitude: 139.6503,
  locationName: 'Test Location',
  rating: 4,
  notes: 'This is a test material for E2E tests',
  equipments: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  // テスト環境でのみ有効
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in test/development environment' },
      { status: 403 },
    );
  }

  try {
    // まずデータベースから「test」スラッグの素材を検索
    const material = await prisma.material.findUnique({
      where: { slug: 'test' },
      include: {
        tags: true,
        equipments: true,
      },
    });

    if (material) {
      // 実際の素材が存在する場合は、APIレスポンスの形式に整形
      const responseData = {
        id: material.id,
        slug: material.slug,
        title: material.title,
        description: material.memo,
        memo: material.memo,
        recordedDate: material.recordedAt.toISOString(),
        categoryName: null,
        tags: material.tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })),
        filePath: material.filePath,
        fileFormat: material.fileFormat,
        sampleRate: material.sampleRate,
        bitDepth: material.bitDepth,
        durationSeconds: material.durationSeconds,
        channels: material.channels,
        latitude: material.latitude,
        longitude: material.longitude,
        locationName: material.locationName,
        rating: material.rating,
        notes: material.memo,
        equipments: material.equipments.map((equipment) => ({
          id: equipment.id,
          name: equipment.name,
          type: equipment.type,
          manufacturer: equipment.manufacturer,
        })),
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      };
      return NextResponse.json(responseData);
    }

    // 素材が存在しない場合は、ダミーデータを返す
    return NextResponse.json(testMaterialData);
  } catch (error) {
    console.error('Error in test GET endpoint:', error);
    // エラーが発生した場合もダミーデータを返す
    return NextResponse.json(testMaterialData);
  }
}

export async function POST(request: NextRequest) {
  // テスト環境でのみ有効
  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in test/development environment' },
      { status: 403 },
    );
  }

  try {
    const data = await request.json();
    const result = await createMaterialForTest(data);

    if (result.success) {
      return NextResponse.json(result.data, { status: 201 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test material' },
      { status: 500 },
    );
  }
}
