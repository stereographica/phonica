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
    it('should return a list of materials with default sorting', async () => {
      const mockMaterials = [
        {
          id: 'mat1', title: 'Material 1', slug: 'mat-1', filePath: 'path/1', recordedAt: new Date(), memo: 'Memo 1', createdAt: new Date(), updatedAt: new Date(),
          tags: [{ id: 'tag1', name: 'Nature', slug: 'nature', createdAt: new Date(), updatedAt: new Date(), materials: [] }],
          fileFormat: null, sampleRate: null, bitDepth: null, latitude: null, longitude: null, locationName: null, rating: null, equipments: [], projects: []
        },
        {
          id: 'mat2', title: 'Material 2', slug: 'mat-2', filePath: 'path/2', recordedAt: new Date(), memo: 'Memo 2', createdAt: new Date(), updatedAt: new Date(),
          tags: [{ id: 'tag2', name: 'Urban', slug: 'urban', createdAt: new Date(), updatedAt: new Date(), materials: [] }],
          fileFormat: null, sampleRate: null, bitDepth: null, latitude: null, longitude: null, locationName: null, rating: null, equipments: [], projects: []
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.material.findMany.mockResolvedValue(mockMaterials as any);

      const request = createMockRequest('GET');
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toHaveLength(2);
      expect(responseBody[0].title).toBe('Material 1');
      expect(responseBody[0].description).toBe('Memo 1');
      expect(responseBody[0].tags[0].name).toBe('Nature');
      expect(prismaMock.material.findMany).toHaveBeenCalledWith({
        include: { tags: true },
        orderBy: { createdAt: 'desc' },
      });
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
