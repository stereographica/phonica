import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Prismaのモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    equipment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('GET /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('バリデーション', () => {
    it('検索クエリがない場合は400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Search query is required');
    });

    it('空の検索クエリの場合は400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Search query is required');
    });

    it('無効なtypeパラメータの場合は400エラーを返す', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=test&type=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('検索機能', () => {
    const mockMaterials = [
      {
        id: '1',
        slug: 'forest-recording',
        title: 'Forest Recording',
        filePath: '/uploads/forest.wav',
        recordedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        tags: [{ id: 't1', name: 'nature', slug: 'nature' }],
        equipments: [{ id: 'e1', name: 'Zoom H6', type: 'Recorder' }],
      },
      {
        id: '2',
        slug: 'ocean-waves',
        title: 'Ocean Waves',
        filePath: '/uploads/ocean.wav',
        recordedAt: new Date('2024-01-02'),
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        tags: [{ id: 't1', name: 'nature', slug: 'nature' }],
        equipments: [],
      },
    ];

    const mockTags = [
      {
        id: 't1',
        name: 'nature',
        slug: 'nature',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { materials: 2 },
      },
    ];

    const mockEquipment = [
      {
        id: 'e1',
        name: 'Zoom H6',
        type: 'Recorder',
        manufacturer: 'Zoom',
        memo: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    it('type=allの場合、すべてのエンティティを検索する', async () => {
      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (prisma.material.count as jest.Mock).mockResolvedValue(2);
      (prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags);
      (prisma.tag.count as jest.Mock).mockResolvedValue(1);
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue(mockEquipment);
      (prisma.equipment.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/search?q=nature&type=all');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('nature');
      expect(data.data.materials).toHaveLength(2);
      expect(data.data.tags).toHaveLength(1);
      expect(data.data.equipment).toHaveLength(1);
      expect(data.pagination.totalItems).toBe(4); // 2 + 1 + 1
    });

    it('type=materialsの場合、素材のみを検索する', async () => {
      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (prisma.material.count as jest.Mock).mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/search?q=forest&type=materials');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.materials).toHaveLength(2);
      expect(data.data.tags).toBeUndefined();
      expect(data.data.equipment).toBeUndefined();
      expect(data.pagination.totalItems).toBe(2);

      // tag/equipmentの検索が呼ばれていないことを確認
      expect(prisma.tag.findMany).not.toHaveBeenCalled();
      expect(prisma.equipment.findMany).not.toHaveBeenCalled();
    });

    it('大文字小文字を区別せずに検索する', async () => {
      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (prisma.material.count as jest.Mock).mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/search?q=FOREST&type=materials');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ title: { contains: 'FOREST', mode: 'insensitive' } }]),
          }),
        }),
      );
    });

    it('ページネーションが正しく動作する', async () => {
      (prisma.material.findMany as jest.Mock).mockResolvedValue([mockMaterials[0]]);
      (prisma.material.count as jest.Mock).mockResolvedValue(50);

      const request = new NextRequest(
        'http://localhost:3000/api/search?q=test&type=materials&page=2&limit=10',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toEqual({
        page: 2,
        limit: 10,
        totalPages: 5,
        totalItems: 50,
      });

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit
          take: 10,
        }),
      );
    });

    it('検索結果が空の場合でも正常にレスポンスを返す', async () => {
      (prisma.material.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.material.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost:3000/api/search?q=nonexistent&type=materials',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.materials).toEqual([]);
      expect(data.pagination.totalItems).toBe(0);
    });

    it('素材の関連データ（tags, equipments）を含めて返す', async () => {
      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (prisma.material.count as jest.Mock).mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/search?q=test&type=materials');
      await GET(request);

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            tags: true,
            equipments: true,
          },
        }),
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合は500エラーを返す', async () => {
      (prisma.material.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/search?q=test&type=materials');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to perform search');
    });
  });

  describe('複数フィールドの検索', () => {
    it('素材のタイトル、メモ、場所名を横断検索する', async () => {
      (prisma.material.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.material.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/search?q=tokyo&type=materials');
      await GET(request);

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'tokyo', mode: 'insensitive' } },
              { memo: { contains: 'tokyo', mode: 'insensitive' } },
              { locationName: { contains: 'tokyo', mode: 'insensitive' } },
              {
                tags: {
                  some: {
                    name: { contains: 'tokyo', mode: 'insensitive' },
                  },
                },
              },
              {
                equipments: {
                  some: {
                    name: { contains: 'tokyo', mode: 'insensitive' },
                  },
                },
              },
            ],
          },
        }),
      );
    });
  });

  describe('検索結果のスコアリング', () => {
    it('タイトルの完全一致が最高スコアを持つ', async () => {
      const mockMaterialsWithScoring = [
        {
          id: '1',
          slug: 'forest-recording',
          title: 'Forest Recording',
          filePath: '/uploads/forest.wav',
          recordedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          memo: null,
          locationName: null,
          tags: [],
          equipments: [],
        },
        {
          id: '2',
          slug: 'forest-ambience',
          title: 'forest',
          filePath: '/uploads/forest2.wav',
          recordedAt: new Date('2024-01-02'),
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          memo: null,
          locationName: null,
          tags: [],
          equipments: [],
        },
      ];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterialsWithScoring);
      (prisma.material.count as jest.Mock).mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/search?q=forest&type=materials');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.materials).toHaveLength(2);
      // 完全一致のものが最初に来ることを確認
      expect(data.data.materials[0].title.toLowerCase()).toBe('forest');
      expect(data.data.materials[0].score).toBeGreaterThan(data.data.materials[1].score);
    });

    it('検索フィールドごとに異なるスコアを付与する', async () => {
      const mockMaterialsWithDifferentMatches = [
        {
          id: '1',
          slug: 'tokyo-street',
          title: 'Tokyo Street Sounds',
          filePath: '/uploads/tokyo.wav',
          recordedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          memo: null,
          locationName: null,
          tags: [],
          equipments: [],
        },
        {
          id: '2',
          slug: 'city-ambience',
          title: 'City Ambience',
          filePath: '/uploads/city.wav',
          recordedAt: new Date('2024-01-02'),
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          memo: 'Recorded in Tokyo',
          locationName: null,
          tags: [],
          equipments: [],
        },
        {
          id: '3',
          slug: 'nature-sounds',
          title: 'Nature Sounds',
          filePath: '/uploads/nature.wav',
          recordedAt: new Date('2024-01-03'),
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
          memo: null,
          locationName: 'Tokyo Park',
          tags: [],
          equipments: [],
        },
      ];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterialsWithDifferentMatches);
      (prisma.material.count as jest.Mock).mockResolvedValue(3);

      const request = new NextRequest('http://localhost:3000/api/search?q=Tokyo&type=materials');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.materials).toHaveLength(3);
      // タイトルマッチが最高スコア
      expect(data.data.materials[0].title).toContain('Tokyo');
      // その他のフィールドマッチは低いスコア
      expect(data.data.materials[0].score).toBeGreaterThan(data.data.materials[1].score);
      expect(data.data.materials[0].score).toBeGreaterThan(data.data.materials[2].score);
    });

    it('type=allの場合、すべてのエンティティにスコアが付与される', async () => {
      const mockMaterials = [
        {
          id: '1',
          slug: 'nature-recording',
          title: 'Nature Recording',
          filePath: '/uploads/nature.wav',
          recordedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          tags: [],
          equipments: [],
        },
      ];
      const mockTags = [
        {
          id: 't1',
          name: 'nature',
          slug: 'nature',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          _count: { materials: 5 },
        },
      ];
      const mockEquipment = [
        {
          id: 'e1',
          name: 'Nature Recorder',
          type: 'Recorder',
          manufacturer: 'Generic',
          memo: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (prisma.material.count as jest.Mock).mockResolvedValue(1);
      (prisma.tag.findMany as jest.Mock).mockResolvedValue(mockTags);
      (prisma.tag.count as jest.Mock).mockResolvedValue(1);
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue(mockEquipment);
      (prisma.equipment.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/search?q=nature&type=all');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 各エンティティにスコアが付与されていることを確認
      expect(data.data.materials[0]).toHaveProperty('score');
      expect(data.data.tags[0]).toHaveProperty('score');
      expect(data.data.equipment[0]).toHaveProperty('score');
    });
  });
});
