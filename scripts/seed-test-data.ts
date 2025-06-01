import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

// コマンドライン引数からデータベースURLを取得
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/phonica_test';

console.log(`🌱 Seeding test data to database: ${databaseUrl}`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...');
  
  // メインテーブルを削除（多対多の関係は自動的に削除される）
  await prisma.material.deleteMany();
  await prisma.project.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.equipment.deleteMany();
  
  console.log('✅ Database cleaned');
}

async function seedTestData() {
  console.log('🌱 Creating test data...');

  // タグの作成
  const tags = await Promise.all([
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: '自然音',
        slug: 'nature-sounds',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: '都市音',
        slug: 'urban-sounds',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: '環境音',
        slug: 'ambient-sounds',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: '水音',
        slug: 'water-sounds',
      },
    }),
  ]);

  console.log(`✅ Created ${tags.length} tags`);

  // 機材の作成
  const equipment = await Promise.all([
    prisma.equipment.create({
      data: {
        id: randomUUID(),
        name: 'Zoom H6',
        type: 'Recorder',
        manufacturer: 'Zoom',
      },
    }),
    prisma.equipment.create({
      data: {
        id: randomUUID(),
        name: 'Sony PCM-D100',
        type: 'Recorder',
        manufacturer: 'Sony',
      },
    }),
    prisma.equipment.create({
      data: {
        id: randomUUID(),
        name: 'Rode NTG3',
        type: 'Microphone',
        manufacturer: 'Rode',
      },
    }),
    prisma.equipment.create({
      data: {
        id: randomUUID(),
        name: 'Sennheiser MKH 416',
        type: 'Microphone',
        manufacturer: 'Sennheiser',
      },
    }),
  ]);

  console.log(`✅ Created ${equipment.length} equipment`);

  // プロジェクトの作成
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        id: randomUUID(),
        slug: 'forest-sounds-project',
        name: '森林環境音プロジェクト',
        description: '日本の森林で録音した環境音のコレクション',
      },
    }),
    prisma.project.create({
      data: {
        id: randomUUID(),
        slug: 'urban-soundscape',
        name: '都市サウンドスケープ',
        description: '東京の様々な場所で録音した都市音',
      },
    }),
  ]);

  console.log(`✅ Created ${projects.length} projects`);

  // 素材の作成
  const materials = [
    {
      title: '森の朝',
      slug: 'forest-morning',
      filePath: '/uploads/forest-morning.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-05-15T05:30:00Z'),
      latitude: 35.6762,
      longitude: 139.6503,
      locationName: '東京都内の森林公園',
      memo: '早朝の森で録音した鳥のさえずりと風の音。天気：晴れ、気温：15度',
      rating: 5,
      tags: [tags[0], tags[2]], // 自然音, 環境音
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: [projects[0]], // 森林環境音プロジェクト
    },
    {
      title: '渓流の音',
      slug: 'mountain-stream',
      filePath: '/uploads/mountain-stream.wav',
      fileFormat: 'WAV',
      sampleRate: 96000,
      bitDepth: 24,
      recordedAt: new Date('2024-05-20T10:00:00Z'),
      latitude: 35.3606,
      longitude: 138.7274,
      locationName: '富士山麓',
      memo: '山間部の渓流の水音。富士山麓の清流',
      rating: 4,
      tags: [tags[0], tags[2], tags[3]], // 自然音, 環境音, 水音
      equipments: [equipment[1]], // Sony PCM-D100
      projects: [projects[0]], // 森林環境音プロジェクト
    },
    {
      title: '新宿駅の喧騒',
      slug: 'shinjuku-station',
      filePath: '/uploads/shinjuku-station.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-06-01T18:00:00Z'),
      latitude: 35.6896,
      longitude: 139.7006,
      locationName: '新宿駅',
      memo: 'ラッシュアワーの新宿駅構内。平日夕方のラッシュアワー',
      rating: 3,
      tags: [tags[1], tags[2]], // 都市音, 環境音
      equipments: [equipment[0], equipment[3]], // Zoom H6, Sennheiser MKH 416
      projects: [projects[1]], // 都市サウンドスケープ
    },
    {
      title: '雨の日の街角',
      slug: 'rainy-street',
      filePath: '/uploads/rainy-street.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-06-10T14:30:00Z'),
      latitude: 35.6812,
      longitude: 139.7671,
      locationName: '東京都内',
      memo: '雨が降る都市の街角の音。梅雨の午後、中程度の雨',
      rating: 4,
      tags: [tags[1], tags[2], tags[3]], // 都市音, 環境音, 水音
      equipments: [equipment[1], equipment[2]], // Sony PCM-D100, Rode NTG3
      projects: [projects[1]], // 都市サウンドスケープ
    },
  ];

  for (const materialData of materials) {
    const { tags, equipments, projects, ...data } = materialData;
    
    const material = await prisma.material.create({
      data: {
        id: randomUUID(),
        ...data,
        tags: {
          connect: tags.map(tag => ({ id: tag.id })),
        },
        equipments: {
          connect: equipments.map(equip => ({ id: equip.id })),
        },
        projects: {
          connect: projects.map(project => ({ id: project.id })),
        },
      },
    });
    
    console.log(`✅ Created material: ${material.title}`);
  }

  console.log(`✅ Created ${materials.length} materials with relationships`);
}

async function main() {
  try {
    await cleanDatabase();
    await seedTestData();
    console.log('🎉 Test data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();