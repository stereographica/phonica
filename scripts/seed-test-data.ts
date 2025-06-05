import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

// コマンドライン引数からデータベースURLを取得
const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/phonica_test';

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
        name: '🌿 自然音',
        slug: 'nature-sounds',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: '🏙️ 都市音',
        slug: 'urban-sounds',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: '🎵 環境音',
        slug: 'ambient-sounds',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: '💧 水音',
        slug: 'water-sounds',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: 'Field Recording',
        slug: 'field-recording',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: 'Binaural Audio',
        slug: 'binaural-audio',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: 'ASMR 🎧',
        slug: 'asmr',
      },
    }),
    prisma.tag.create({
      data: {
        id: randomUUID(),
        name: 'Wildlife Sounds 🦁',
        slug: 'wildlife-sounds',
      },
    }),
  ]);

  console.log(`✅ Created ${tags.length} tags`);

  // 機材の作成（テスト負荷軽減のため最小限に）
  const equipment = await Promise.all([
    prisma.equipment.create({
      data: {
        id: randomUUID(),
        name: 'Zoom H6',
        type: 'Recorder',
        manufacturer: 'Zoom',
        memo: 'プロフェッショナル向け6チャンネルレコーダー',
      },
    }),
    prisma.equipment.create({
      data: {
        id: randomUUID(),
        name: 'Sony PCM-D100',
        type: 'Recorder',
        manufacturer: 'Sony',
        memo: 'High-end portable recorder with built-in mics',
      },
    }),
    prisma.equipment.create({
      data: {
        id: randomUUID(),
        name: 'Rode NTG3',
        type: 'Microphone',
        manufacturer: 'Rode',
        memo: 'ショットガンマイク 🎤',
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
        name: '🌲 森林環境音プロジェクト',
        description: '🎅 日本の森林で録音した環境音のコレクション',
      },
    }),
    prisma.project.create({
      data: {
        id: randomUUID(),
        slug: 'urban-soundscape',
        name: '🏙️ 都市サウンドスケープ',
        description: '🗼 東京の様々な場所で録音した都市音',
      },
    }),
    prisma.project.create({
      data: {
        id: randomUUID(),
        slug: 'nature-documentary-2024',
        name: 'Nature Documentary Sound Design',
        description: 'Field recordings for the 2024 wildlife documentary series 🎬',
      },
    }),
    prisma.project.create({
      data: {
        id: randomUUID(),
        slug: 'meditation-sounds',
        name: 'Meditation & Relaxation 🧘',
        description: 'Calming sounds from around the world for meditation apps',
      },
    }),
  ]);

  console.log(`✅ Created ${projects.length} projects`);

  // 素材の作成
  const materials = [
    {
      title: '🌄 森の朝',
      slug: 'forest-morning',
      filePath: '/uploads/forest-morning.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-05-15T05:30:00Z'),
      latitude: 35.6762,
      longitude: 139.6503,
      locationName: '東京都内の森林公園',
      memo: '🌳 早朝の森で録音した鳥のさえずりと風の音。☀️ 天気：晴れ、🌡️ 気温：15度',
      rating: 5,
      tags: [tags[0], tags[2]], // 自然音, 環境音
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: [projects[0]], // 森林環境音プロジェクト
    },
    {
      title: '🏞️ 渓流の音',
      slug: 'mountain-stream',
      filePath: '/uploads/mountain-stream.wav',
      fileFormat: 'WAV',
      sampleRate: 96000,
      bitDepth: 24,
      recordedAt: new Date('2024-05-20T10:00:00Z'),
      latitude: 35.3606,
      longitude: 138.7274,
      locationName: '富士山麓',
      memo: '🏔️ 山間部の渓流の水音。🗾 富士山麓の清流',
      rating: 4,
      tags: [tags[0], tags[2], tags[3]], // 自然音, 環境音, 水音
      equipments: [equipment[1]], // Sony PCM-D100
      projects: [projects[0]], // 森林環境音プロジェクト
    },
    {
      title: '🚉 新宿駅の喧騒',
      slug: 'shinjuku-station',
      filePath: '/uploads/shinjuku-station.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-06-01T18:00:00Z'),
      latitude: 35.6896,
      longitude: 139.7006,
      locationName: '新宿駅',
      memo: '🕰️ ラッシュアワーの新宿駅構内。👥 平日夕方のラッシュアワー',
      rating: 3,
      tags: [tags[1], tags[2]], // 都市音, 環境音
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: [projects[1]], // 都市サウンドスケープ
    },
    {
      title: '☔ 雨の日の街角',
      slug: 'rainy-street',
      filePath: '/uploads/rainy-street.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-06-10T14:30:00Z'),
      latitude: 35.6812,
      longitude: 139.7671,
      locationName: '東京都内',
      memo: '🌧️ 雨が降る都市の街角の音。🌸 梅雨の午後、中程度の雨',
      rating: 4,
      tags: [tags[1], tags[2], tags[3]], // 都市音, 環境音, 水音
      equipments: [equipment[1], equipment[2]], // Sony PCM-D100, Rode NTG3
      projects: [projects[1]], // 都市サウンドスケープ
    },
    {
      title: 'Ocean Waves at Dawn',
      slug: 'ocean-waves-dawn',
      filePath: '/uploads/ocean-waves-dawn.wav',
      fileFormat: 'WAV',
      sampleRate: 192000,
      bitDepth: 32,
      recordedAt: new Date('2024-04-10T05:00:00Z'),
      latitude: 21.2868,
      longitude: -157.9176,
      locationName: 'Waikiki Beach, Hawaii',
      memo: 'Gentle waves recorded at sunrise. Crystal clear recording of Pacific Ocean. 🌊 Perfect for meditation.',
      rating: 5,
      tags: [tags[3], tags[4], tags[5]], // 水音, Field Recording, Binaural Audio
      equipments: [equipment[1], equipment[2]], // Sony PCM-D100, Rode NTG3
      projects: [projects[2], projects[3]], // Nature Documentary, Meditation
    },
    {
      title: 'London Underground Ambience',
      slug: 'london-underground',
      filePath: '/uploads/london-underground.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-07-05T08:30:00Z'),
      latitude: 51.5031,
      longitude: -0.1132,
      locationName: 'Westminster Station, London',
      memo: 'Morning rush hour at Westminster tube station. Mind the gap! 🚇 Includes announcements and train arrivals.',
      rating: 4,
      tags: [tags[1], tags[4]], // 都市音, Field Recording
      equipments: [equipment[0]], // Zoom H6
      projects: [projects[1]], // 都市サウンドスケープ
    },
    {
      title: 'Tropical Rainforest 🦜',
      slug: 'tropical-rainforest',
      filePath: '/uploads/tropical-rainforest.wav',
      fileFormat: 'FLAC',
      sampleRate: 96000,
      bitDepth: 24,
      recordedAt: new Date('2024-03-22T06:15:00Z'),
      latitude: -3.4653,
      longitude: -62.2159,
      locationName: 'Amazon Rainforest, Brazil',
      memo: 'Dense rainforest soundscape with exotic birds and insects. 🌴 Recorded during the golden hour. Amazing biodiversity!',
      rating: 5,
      tags: [tags[0], tags[7], tags[4]], // 自然音, Wildlife Sounds, Field Recording
      equipments: [equipment[1], equipment[2]], // Sony PCM-D100, Rode NTG3
      projects: [projects[2]], // Nature Documentary
    },
    {
      title: 'カフェの午後 ☕',
      slug: 'cafe-afternoon',
      filePath: '/uploads/cafe-afternoon.wav',
      fileFormat: 'WAV',
      sampleRate: 44100,
      bitDepth: 16,
      recordedAt: new Date('2024-06-20T15:00:00Z'),
      latitude: 35.6595,
      longitude: 139.7005,
      locationName: '渋谷のカフェ',
      memo: 'Cozy cafe atmosphere with espresso machine sounds, soft conversations, and jazz BGM. 完璧なASMR素材！',
      rating: 4,
      tags: tags.length > 6 ? [tags[1], tags[6], tags[2]] : tags.length > 1 ? [tags[1]] : [tags[0]], // 都市音, ASMR, 環境音
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: projects.length > 3 ? [projects[3]] : [projects[0]], // Meditation & Relaxation
    },
    {
      title: 'Arctic Wind ❄️',
      slug: 'arctic-wind',
      filePath: '/uploads/arctic-wind.wav',
      fileFormat: 'WAV',
      sampleRate: 96000,
      bitDepth: 24,
      recordedAt: new Date('2024-01-15T10:00:00Z'),
      latitude: 71.2906,
      longitude: -156.7887,
      locationName: 'Barrow, Alaska',
      memo: 'Harsh arctic winds recorded during polar winter. Temperature: -30°C 🥶',
      rating: 4,
      tags: tags.length > 4 ? [tags[0], tags[4]] : [tags[0]], // 自然音, Field Recording
      equipments: [equipment[1]], // Sony PCM-D100
      projects: projects.length > 2 ? [projects[2]] : [projects[0]], // Nature Documentary
    },
    {
      title: '春の桜吹雪 🌸',
      slug: 'sakura-blizzard',
      filePath: '/uploads/sakura-blizzard.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-04-01T14:00:00Z'),
      latitude: 35.6586,
      longitude: 139.7454,
      locationName: '目黒川、東京',
      memo: '桜吹雪と川のせせらぎ。Cherry blossoms dancing in the wind.',
      rating: 5,
      tags: tags.length > 2 ? [tags[0], tags[2]] : [tags[0]], // 自然音, 環境音
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: [projects[0]], // 森林環境音プロジェクト
    },
    {
      title: 'Desert Night Sounds',
      slug: 'desert-night',
      filePath: '/uploads/desert-night.wav',
      fileFormat: 'FLAC',
      sampleRate: 192000,
      bitDepth: 32,
      recordedAt: new Date('2024-08-20T22:00:00Z'),
      latitude: 36.7783,
      longitude: -119.4179,
      locationName: 'Death Valley, California',
      memo: 'Eerily quiet desert with occasional coyote calls 🐺. Milky way visible overhead.',
      rating: 5,
      tags: tags.length > 7 ? [tags[0], tags[7], tags[4]] : [tags[0]], // 自然音, Wildlife Sounds, Field Recording
      equipments: [equipment[1], equipment[2]], // Sony PCM-D100, Rode NTG3
      projects: projects.length > 2 ? [projects[2]] : [projects[0]], // Nature Documentary
    },
    {
      title: '京都の寺院 🔔',
      slug: 'kyoto-temple',
      filePath: '/uploads/kyoto-temple.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-05-05T06:00:00Z'),
      latitude: 35.0116,
      longitude: 135.7681,
      locationName: '清水寺、京都',
      memo: 'Morning prayers and temple bells. 朝のお経と鐘の音。Peaceful atmosphere.',
      rating: 5,
      tags: tags.length > 6 ? [tags[2], tags[6]] : tags.length > 2 ? [tags[2]] : [tags[0]], // 環境音, ASMR
      equipments: [equipment[0]], // Zoom H6
      projects: projects.length > 3 ? [projects[3]] : [projects[0]], // Meditation & Relaxation
    },
    {
      title: 'Mumbai Market Chaos',
      slug: 'mumbai-market',
      filePath: '/uploads/mumbai-market.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-09-10T11:00:00Z'),
      latitude: 19.076,
      longitude: 72.8777,
      locationName: 'Crawford Market, Mumbai',
      memo: 'Bustling market with vendors calling out prices. Incredible energy! 🇮🇳',
      rating: 4,
      tags: tags.length > 4 ? [tags[1], tags[4]] : tags.length > 1 ? [tags[1]] : [tags[0]], // 都市音, Field Recording
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: [projects[1]], // 都市サウンドスケープ
    },
    {
      title: 'Thunderstorm ⛈️',
      slug: 'thunderstorm',
      filePath: '/uploads/thunderstorm.wav',
      fileFormat: 'WAV',
      sampleRate: 96000,
      bitDepth: 24,
      recordedAt: new Date('2024-07-15T19:00:00Z'),
      latitude: 29.7604,
      longitude: -95.3698,
      locationName: 'Houston, Texas',
      memo: 'Intense summer thunderstorm with close lightning strikes. ⚡️ DO NOT try this at home!',
      rating: 5,
      tags:
        tags.length > 4
          ? [tags[0], tags[3], tags[4]]
          : tags.length > 3
            ? [tags[0], tags[3]]
            : [tags[0]], // 自然音, 水音, Field Recording
      equipments: [equipment[1]], // Sony PCM-D100
      projects: projects.length > 2 ? [projects[2]] : [projects[0]], // Nature Documentary
    },
    {
      title: '秋葉の足音 🍂',
      slug: 'autumn-leaves-footsteps',
      filePath: '/uploads/autumn-leaves.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-10-20T15:30:00Z'),
      latitude: 43.0619,
      longitude: 141.3545,
      locationName: '大通公園、札幌',
      memo: 'Crispy autumn leaves underfoot. カサカサと響く落ち葉の音。Perfect ASMR!',
      rating: 4,
      tags: tags.length > 6 ? [tags[0], tags[6]] : [tags[0]], // 自然音, ASMR
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: projects.length > 3 ? [projects[3]] : [projects[0]], // Meditation & Relaxation
    },
    {
      title: 'New York Subway',
      slug: 'nyc-subway',
      filePath: '/uploads/nyc-subway.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-11-05T17:45:00Z'),
      latitude: 40.758,
      longitude: -73.9855,
      locationName: 'Times Square Station, NYC',
      memo: 'Rush hour madness at Times Square. "Stand clear of the closing doors!" 🚇',
      rating: 3,
      tags: tags.length > 4 ? [tags[1], tags[4]] : tags.length > 1 ? [tags[1]] : [tags[0]], // 都市音, Field Recording
      equipments: [equipment[0]], // Zoom H6
      projects: [projects[1]], // 都市サウンドスケープ
    },
    {
      title: 'Whale Songs 🐋',
      slug: 'whale-songs',
      filePath: '/uploads/whale-songs.wav',
      fileFormat: 'WAV',
      sampleRate: 192000,
      bitDepth: 32,
      recordedAt: new Date('2024-02-28T08:00:00Z'),
      latitude: 20.7984,
      longitude: -156.3319,
      locationName: 'Maui, Hawaii',
      memo: 'Humpback whales singing during mating season. Recorded with hydrophone.',
      rating: 5,
      tags:
        tags.length > 7
          ? [tags[3], tags[7], tags[4], tags[5]]
          : tags.length > 3
            ? [tags[3]]
            : [tags[0]], // 水音, Wildlife Sounds, Field Recording, Binaural
      equipments: [equipment[1]], // Sony PCM-D100
      projects: projects.length > 2 ? [projects[2]] : [projects[0]], // Nature Documentary
    },
    {
      title: '夏祭りの夜 🎆',
      slug: 'summer-festival',
      filePath: '/uploads/summer-festival.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-08-15T20:00:00Z'),
      latitude: 35.6329,
      longitude: 139.8804,
      locationName: '浅草、東京',
      memo: 'Traditional Japanese summer festival. 太鼓の音とヤキソバの匂い！Fireworks at the end!',
      rating: 5,
      tags: tags.length > 2 ? [tags[1], tags[2]] : tags.length > 1 ? [tags[1]] : [tags[0]], // 都市音, 環境音
      equipments: [equipment[0], equipment[2]], // Zoom H6, Rode NTG3
      projects: [projects[1]], // 都市サウンドスケープ
    },
    {
      title: 'Ice Cave Echoes',
      slug: 'ice-cave',
      filePath: '/uploads/ice-cave.wav',
      fileFormat: 'FLAC',
      sampleRate: 96000,
      bitDepth: 24,
      recordedAt: new Date('2024-03-10T14:00:00Z'),
      latitude: 64.0685,
      longitude: -16.3179,
      locationName: 'Vatnajökull, Iceland',
      memo: 'Inside a glacial ice cave. Dripping water and cracking ice. 🧊 Ethereal!',
      rating: 5,
      tags:
        tags.length > 4
          ? [tags[0], tags[3], tags[4]]
          : tags.length > 3
            ? [tags[0], tags[3]]
            : [tags[0]], // 自然音, 水音, Field Recording
      equipments: [equipment[1], equipment[2]], // Sony PCM-D100, Rode NTG3
      projects: projects.length > 2 ? [projects[2]] : [projects[0]], // Nature Documentary
    },
    {
      title: '温泉の音 ♨️',
      slug: 'hot-spring',
      filePath: '/uploads/hot-spring.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date('2024-12-01T07:00:00Z'),
      latitude: 36.2048,
      longitude: 138.2529,
      locationName: '草津温泉、群馬',
      memo: 'Bubbling hot springs and bamboo water features. コポコポと湧く温泉の音。Relaxing!',
      rating: 5,
      tags: tags.length > 6 ? [tags[3], tags[6], tags[2]] : tags.length > 3 ? [tags[3]] : [tags[0]], // 水音, ASMR, 環境音
      equipments: [equipment[0]], // Zoom H6
      projects: projects.length > 3 ? [projects[3]] : [projects[0]], // Meditation & Relaxation
    },
    {
      title: 'Savanna Dawn Chorus',
      slug: 'savanna-dawn',
      filePath: '/uploads/savanna-dawn.wav',
      fileFormat: 'WAV',
      sampleRate: 96000,
      bitDepth: 24,
      recordedAt: new Date('2024-09-25T05:30:00Z'),
      latitude: -1.2921,
      longitude: 36.8219,
      locationName: 'Masai Mara, Kenya',
      memo: 'African savanna awakening. Lions roaring in the distance! 🦁🌍',
      rating: 5,
      tags: tags.length > 7 ? [tags[0], tags[7], tags[4]] : [tags[0]], // 自然音, Wildlife Sounds, Field Recording
      equipments: [equipment[1], equipment[2]], // Sony PCM-D100, Rode NTG3
      projects: projects.length > 2 ? [projects[2]] : [projects[0]], // Nature Documentary
    },
  ];

  for (const materialData of materials) {
    const { tags, equipments, projects, ...data } = materialData;

    const material = await prisma.material.create({
      data: {
        id: randomUUID(),
        ...data,
        tags: {
          connect: tags.map((tag) => ({ id: tag.id })),
        },
        equipments: {
          connect: equipments.map((equip) => ({ id: equip.id })),
        },
        projects: {
          connect: projects.map((project) => ({ id: project.id })),
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
