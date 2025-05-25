/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/materials/route';
import { prismaMock } from '../../../../../jest.setup'; // モックされたPrisma Clientをインポート
import { NextRequest } from 'next/server';
// import { jest } from '@jest/globals'; // jest オブジェクトは通常グローバルなので削除

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockRequest(method: string, body?: any, searchParams?: URLSearchParams): NextRequest {
  const url = new URL(`http://localhost/api/materials${searchParams ? `?${searchParams.toString()}` : ''}`);
  const request = new Request(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return request as NextRequest;
}

describe('/api/materials', () => {
  describe('GET', () => {
    const baseMockMaterials = [
      {
        id: 'mat1', title: 'Alpha Sound', slug: 'alpha-sound', filePath: 'path/alpha.wav', recordedAt: new Date('2023-01-15T10:00:00Z'), memo: 'First sound', createdAt: new Date('2023-01-15T10:00:00Z'), updatedAt: new Date(),
        tags: [{ id: 'tag1', name: 'Nature', slug: 'nature', createdAt: new Date(), updatedAt: new Date(), materials:[] }, { id: 'tag3', name: 'Ambient', slug: 'ambient', createdAt: new Date(), updatedAt: new Date(), materials:[] }],
        equipments: [{id: 'eq1', name: 'Recorder A', type: 'Recorder', manufacturer: 'MakerX', memo:null, createdAt: new Date(), updatedAt: new Date()}],
        fileFormat: 'WAV', sampleRate: 48000, bitDepth: 24, rating: 5, latitude: null, longitude: null, locationName: null, 
      },
      {
        id: 'mat2', title: 'Beta Beat', slug: 'beta-beat', filePath: 'path/beta.mp3', recordedAt: new Date('2023-02-20T14:30:00Z'), memo: 'Second beat', createdAt: new Date('2023-02-20T14:30:00Z'), updatedAt: new Date(),
        tags: [{ id: 'tag2', name: 'Urban', slug: 'urban', createdAt: new Date(), updatedAt: new Date(), materials:[] }, { id: 'tag3', name: 'Ambient', slug: 'ambient', createdAt: new Date(), updatedAt: new Date(), materials:[] }],
        equipments: [{id: 'eq2', name: 'Mic B', type: 'Microphone', manufacturer: 'MakerY', memo:null, createdAt: new Date(), updatedAt: new Date()}],
        fileFormat: 'MP3', sampleRate: 44100, bitDepth: 16, rating: 4, latitude: null, longitude: null, locationName: null, 
      },
      {
        id: 'mat3', title: 'Gamma Groove', slug: 'gamma-groove', filePath: 'path/gamma.flac', recordedAt: new Date('2023-03-10T08:00:00Z'), memo: 'Third groove', createdAt: new Date('2023-03-10T08:00:00Z'), updatedAt: new Date(),
        tags: [{ id: 'tag1', name: 'Nature', slug: 'nature', createdAt: new Date(), updatedAt: new Date(), materials:[] }],
        equipments: [],
        fileFormat: 'FLAC', sampleRate: 96000, bitDepth: 24, rating: 3, latitude: null, longitude: null, locationName: null, 
      },
    ];

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.material.findMany.mockImplementation(async (args: any) => {
        let filteredMaterials = [...baseMockMaterials];
        if (args.where?.title?.contains) {
          filteredMaterials = filteredMaterials.filter(m => m.title.toLowerCase().includes(args.where.title.contains.toLowerCase()));
        }
        if (args.where?.tags?.some?.name) {
          filteredMaterials = filteredMaterials.filter(m => m.tags.some(t => t.name === args.where.tags.some.name));
        }
        // orderBy (簡易的な実装、本番APIはPrismaが処理)
        if (args.orderBy) {
          const sortBy = Object.keys(args.orderBy)[0];
          const sortOrder = args.orderBy[sortBy];
          filteredMaterials.sort((a, b) => {
            if (a[sortBy as keyof typeof a] < b[sortBy as keyof typeof b]) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortBy as keyof typeof a] > b[sortBy as keyof typeof b]) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }

        const skip = args.skip || 0;
        const take = args.take || 10;
        return filteredMaterials.slice(skip, skip + take);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.material.count.mockImplementation(async (args: any) => {
        let filteredMaterials = [...baseMockMaterials];
         if (args.where?.title?.contains) {
          filteredMaterials = filteredMaterials.filter(m => m.title.toLowerCase().includes(args.where.title.contains.toLowerCase()));
        }
        if (args.where?.tags?.some?.name) {
          filteredMaterials = filteredMaterials.filter(m => m.tags.some(t => t.name === args.where.tags.some.name));
        }
        return filteredMaterials.length;
      });
    });

    it('should return a list of materials with default pagination and sorting', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(3); // default limit 10, 3 items total
      expect(responseBody.data[0].title).toBe('Gamma Groove'); // default sort createdAt desc
      expect(responseBody.data[0].tags).toBeDefined();
      expect(responseBody.data[0].equipments).toBeDefined();
      expect(responseBody.pagination.page).toBe(1);
      expect(responseBody.pagination.limit).toBe(10);
      expect(responseBody.pagination.totalPages).toBe(1);
      expect(responseBody.pagination.totalItems).toBe(3);
      expect(prismaMock.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { tags: true, equipments: true },
        where: {}
      }));
      expect(prismaMock.material.count).toHaveBeenCalledWith({where: {}});
    });

    it('should handle page and limit parameters', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ page: '2', limit: '1' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].title).toBe('Beta Beat'); // Second item by createdAt desc
      expect(responseBody.pagination.page).toBe(2);
      expect(responseBody.pagination.limit).toBe(1);
      expect(responseBody.pagination.totalPages).toBe(3);
      expect(prismaMock.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 1,
        take: 1,
      }));
    });

    it('should handle sortBy and sortOrder parameters (title asc)', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ sortBy: 'title', sortOrder: 'asc' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(3);
      expect(responseBody.data[0].title).toBe('Alpha Sound');
      expect(prismaMock.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { title: 'asc' },
      }));
    });

    it('should filter by title (case-insensitive)', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ title: 'alpha' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].title).toBe('Alpha Sound');
      expect(prismaMock.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { title: { contains: 'alpha', mode: 'insensitive' } },
      }));
    });

    it('should filter by tag name', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ tag: 'Urban' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].title).toBe('Beta Beat');
      expect(prismaMock.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { tags: { some: { name: 'Urban' } } },
      }));
    });

    it('should return 400 for invalid query parameters (e.g., page as string)', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ page: 'invalidPage' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid query parameters');
      expect(responseBody.details).toBeDefined();
    });

    it('should return 500 if Prisma query fails', async () => {
      prismaMock.material.findMany.mockRejectedValue(new Error('DB Error'));
      const request = createMockRequest('GET');
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to fetch materials');
    });
  });

  describe('POST', () => {
    const validMaterialData = {
      title: 'New Sound',
      filePath: '/sounds/new_sound.wav',
      recordedAt: new Date().toISOString(),
      memo: 'A very new sound',
      tags: ['new', 'test'],
      fileFormat: 'WAV', sampleRate: 48000, bitDepth: 24
    };

    it('should create a new material and return 201', async () => {
      const createdMaterialResponse = {
        ...validMaterialData,
        id: 'mat3',
        slug: 'new-sound',
        recordedAt: new Date(validMaterialData.recordedAt),
        createdAt: new Date(),
        updatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: [{ id: 'tag-new', name: 'new', slug:'new', createdAt: new Date(), updatedAt: new Date(), materials: [] as any[]}, {id: 'tag-test', name: 'test', slug:'test', createdAt: new Date(), updatedAt: new Date(), materials: [] as any[]}],
        fileFormat: 'WAV', sampleRate: 48000, bitDepth: 24, latitude: null, longitude: null, locationName: null, rating: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        equipments: [] as any[], projects: [] as any[]
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.material.create.mockResolvedValue(createdMaterialResponse as any);

      const request = createMockRequest('POST', validMaterialData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.title).toBe(validMaterialData.title);
      expect(responseBody.slug).toBe('new-sound');
      expect(responseBody.tags).toHaveLength(2);
      expect(responseBody.tags[0].name).toBe('new');
      expect(prismaMock.material.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: validMaterialData.title,
          filePath: validMaterialData.filePath,
          slug: 'new-sound',
          memo: validMaterialData.memo,
          tags: {
            connectOrCreate: [
              { where: { name: 'new' }, create: { name: 'new', slug: 'new' } },
              { where: { name: 'test' }, create: { name: 'test', slug: 'test' } },
            ],
          },
        }),
        include: { tags: true },
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const request = createMockRequest('POST', { title: 'Incomplete' });
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Missing required fields: title, filePath, recordedAt');
    });

    it('should return 409 if slug already exists', async () => {
      prismaMock.material.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['slug'] },
      });

      const request = createMockRequest('POST', validMaterialData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Failed to create material: Slug already exists. Please change the title.');
    });

    it('should return 500 for other database errors on create', async () => {
      prismaMock.material.create.mockRejectedValue(new Error('Some other DB error'));
      const request = createMockRequest('POST', validMaterialData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to create material');
    });
  });
}); 
