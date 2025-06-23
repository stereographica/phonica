import { GET } from '../stats/route';
import { prisma } from '@/lib/prisma';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Prismaのモック
jest.mock('@/lib/prisma', () => ({
  prisma: mockDeep<typeof prisma>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe('/api/dashboard/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('ダッシュボード統計データを正常に返す', async () => {
      // モックデータの準備
      prismaMock.material.count.mockResolvedValueOnce(150); // totalMaterials

      // 月別カウント用のモック（6回呼ばれる）
      prismaMock.material.count.mockResolvedValueOnce(10);
      prismaMock.material.count.mockResolvedValueOnce(15);
      prismaMock.material.count.mockResolvedValueOnce(20);
      prismaMock.material.count.mockResolvedValueOnce(25);
      prismaMock.material.count.mockResolvedValueOnce(30);
      prismaMock.material.count.mockResolvedValueOnce(35);

      prismaMock.material.count.mockResolvedValueOnce(100); // materialsWithLocation

      prismaMock.material.aggregate.mockImplementation(() => {
        return Promise.resolve({
          _sum: { durationSeconds: 18000 }, // 5時間
          _avg: { rating: 3.7 },
          _count: {},
          _max: {},
          _min: {},
        }) as never;
      });

      prismaMock.tag.findMany.mockResolvedValue([
        {
          id: '1',
          slug: 'nature',
          name: '自然',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { materials: 45 },
        } as never,
        {
          id: '2',
          slug: 'rain',
          name: '雨',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { materials: 32 },
        } as never,
      ]);

      prismaMock.equipment.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Zoom H6',
          type: 'recorder',
          manufacturer: 'Zoom',
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { materials: 68 },
        } as never,
        {
          id: '2',
          name: 'TASCAM DR-40X',
          type: 'recorder',
          manufacturer: 'TASCAM',
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { materials: 45 },
        } as never,
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('tagData');
      expect(data).toHaveProperty('monthlyData');
      expect(data).toHaveProperty('equipmentData');

      expect(data.summary).toEqual({
        totalMaterials: 150,
        totalDuration: 300, // 18000秒 = 300分
        averageRating: 3.7,
        materialsWithLocation: 100,
      });

      expect(data.tagData).toHaveLength(2);
      expect(data.tagData[0]).toEqual({
        name: '自然',
        count: 45,
      });

      expect(data.monthlyData).toHaveLength(6);
      expect(data.monthlyData[5]).toEqual({
        month: expect.stringMatching(/^\d+月$/),
        count: 35,
      });

      expect(data.equipmentData).toHaveLength(2);
      expect(data.equipmentData[0]).toEqual({
        name: 'Zoom H6',
        count: 68,
      });
    });

    it('素材が0件の場合でもエラーにならない', async () => {
      prismaMock.material.count.mockResolvedValue(0);
      prismaMock.material.aggregate.mockResolvedValue({
        _sum: { durationSeconds: null },
        _avg: { rating: null },
        _count: {},
        _max: {},
        _min: {},
      } as never);
      prismaMock.tag.findMany.mockResolvedValue([]);
      prismaMock.equipment.findMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalMaterials).toBe(0);
      expect(data.summary.totalDuration).toBe(0);
      expect(data.summary.averageRating).toBe(0);
      expect(data.tagData).toHaveLength(0);
      expect(data.equipmentData).toHaveLength(0);
    });

    it('データベースエラーの場合は500を返す', async () => {
      prismaMock.material.count.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch dashboard statistics',
      });
    });
  });
});
