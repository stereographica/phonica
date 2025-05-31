/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/materials/route';
import { prismaMock } from '../../../../../jest.setup'; // モックされたPrisma Clientをインポート
import { NextRequest } from 'next/server'; // NextResponse を削除
// import { jest } from '@jest/globals'; // jest オブジェクトは通常グローバルなので削除
import { v4 as uuidv4 } from 'uuid';
import path from 'path'; // path をインポート
import fs from 'fs/promises'; // fs/promises をインポート

// FormData and its methods will be mocked globally via jest.setup.ts

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'materials'); // UPLOADS_DIR を定義

// Helper function to create a mock NextRequest
function createMockRequest(
  method: string, 
  body?: unknown, // any から unknown に変更
  searchParams?: URLSearchParams
): NextRequest {
  const url = new URL(`http://localhost/api/materials${searchParams ? '?' + searchParams.toString() : ''}`);
  let requestBody: BodyInit | null | undefined = undefined;
  const headers = new Headers();

  if (body) {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const internalFormData = new FormData(); // グローバルモックを使用
      if (typeof body === 'object' && body !== null) {
        for (const key in body) {
          if (Object.prototype.hasOwnProperty.call(body, key)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = (body as any)[key];
            internalFormData.append(key, value instanceof File ? value : String(value));
          }
        }
      }
      requestBody = internalFormData;
      // Content-Type は FormData によって自動的に設定されるため、ここでは明示的にセットしない
    } else {
      requestBody = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    }
  }

  const req = new NextRequest(url.toString(), {
    method,
    headers,
    body: requestBody,
  });

  // formData メソッドをモック
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).formData = async () => {
    if (requestBody instanceof FormData) {
      return requestBody;
    }
    // 他のケース（例: body がない、JSON body）では空の FormData を返すか、エラーを投げる
    // ここではテスト対象の POST が FormData を期待しているので、requestBody が FormData である前提
    return new FormData(); // Fallback, or throw error if not FormData
  };

  return req;
}

describe('/api/materials', () => {

  afterAll(async () => { // afterAll フックを追加
    try {
      const files = await fs.readdir(UPLOADS_DIR);
      for (const file of files) {
        if (file.startsWith('test-dummy-')) { // 'test-dummy-' プレフィックスのみを対象
          try {
            await fs.unlink(path.join(UPLOADS_DIR, file));
            // console.log(`Cleaned up dummy file: ${file}`);
          } catch (err) {
            console.error(`Failed to delete dummy file ${file}:`, err);
          }
        }
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
        // console.log('Uploads directory for cleanup not found, skipping.');
      } else {
        console.error('Error during dummy file cleanup:', err);
      }
    }
  });

  describe('GET', () => {
    const baseMockMaterials = [
      {
        id: 'mat1', title: 'Alpha Sound', slug: 'alpha-sound', filePath: 'path/alpha.wav', recordedAt: new Date('2023-01-15T10:00:00Z'), memo: 'First sound', createdAt: new Date('2023-01-15T10:00:00Z'), updatedAt: new Date(),
        tags: [{ id: 'tag1', name: 'Nature', slug: 'nature', createdAt: new Date(), updatedAt: new Date(), materials:[] }, { id: 'tag3', name: 'Ambient', slug: 'ambient', createdAt: new Date(), updatedAt: new Date(), materials:[] }],
        equipments: [{ name: 'Recorder A', type: 'Recorder', manufacturer: 'MakerX', memo:null, createdAt: new Date(), updatedAt: new Date()}],
        fileFormat: 'WAV', sampleRate: 48000, bitDepth: 24, rating: 5, latitude: null, longitude: null, locationName: null, 
      },
      {
        id: 'mat2', title: 'Beta Beat', slug: 'beta-beat', filePath: 'path/beta.mp3', recordedAt: new Date('2023-02-20T14:30:00Z'), memo: 'Second beat', createdAt: new Date('2023-02-20T14:30:00Z'), updatedAt: new Date(),
        tags: [{ id: 'tag2', name: 'Urban', slug: 'urban', createdAt: new Date(), updatedAt: new Date(), materials:[] }, { id: 'tag3', name: 'Ambient', slug: 'ambient', createdAt: new Date(), updatedAt: new Date(), materials:[] }],
        equipments: [{ name: 'Mic B', type: 'Microphone', manufacturer: 'MakerY', memo:null, createdAt: new Date(), updatedAt: new Date()}],
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
      // @ts-ignore - Prismaモックの型の問題を回避
      prismaMock.material.findMany.mockImplementation(async (args: any) => {
        let filteredMaterials = [...baseMockMaterials];
        if (args?.where?.title && typeof args.where.title === 'object' && 'contains' in args.where.title) {
          const titleQuery = (args.where.title as { contains: string; mode?: string }).contains.toLowerCase();
          filteredMaterials = filteredMaterials.filter(m => m.title.toLowerCase().includes(titleQuery));
        }
        if (args?.where?.tags?.some?.name) {
          filteredMaterials = filteredMaterials.filter(m => m.tags.some(t => t.name === args!.where!.tags!.some!.name));
        }
        // orderBy (簡易的な実装、本番APIはPrismaが処理)
        if (args?.orderBy && typeof args.orderBy === 'object' && !Array.isArray(args.orderBy)) {
          const sortBy = Object.keys(args.orderBy)[0] as keyof typeof baseMockMaterials[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sortOrder = (args.orderBy as any)[sortBy]; // anyキャストでインデックスアクセスエラー回避
          filteredMaterials.sort((a, b) => {
            if (a[sortBy]! < b[sortBy]!) return sortOrder === 'asc' ? -1 : 1;
            if (a[sortBy]! > b[sortBy]!) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }

        const skip = args?.skip || 0;
        const take = args?.take || 10;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(filteredMaterials.slice(skip, skip + take) as any); // Promiseでラップし、anyキャスト
      });
       
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // @ts-ignore - Prismaモックの型の問題を回避
      prismaMock.material.count.mockImplementation(async (args: any) => {
        let filteredMaterials = [...baseMockMaterials];
         if (args?.where?.title && typeof args.where.title === 'object' && 'contains' in args.where.title) {
          const titleQuery = (args.where.title as { contains: string; mode?: string }).contains.toLowerCase();
          filteredMaterials = filteredMaterials.filter(m => m.title.toLowerCase().includes(titleQuery));
        }
        if (args?.where?.tags?.some?.name) {
          filteredMaterials = filteredMaterials.filter(m => m.tags.some(t => t.name === args!.where!.tags!.some!.name));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(filteredMaterials.length as any); // Promiseでラップし、anyキャスト
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
    const mockFile = new File(['dummy content'], 'test-audio.wav', { type: 'audio/wav' });
    const validMaterialData = {
      title: 'New Sound',
      file: mockFile,
      recordedAt: new Date(),
      memo: 'A very new sound',
      tags: ['new', 'test'],
      equipmentIds: ['equip-1', 'equip-2'],
      fileFormat: 'WAV', 
      sampleRate: 48000, 
      bitDepth: 24,
      latitude: null,
      longitude: null,
      locationName: null,
      rating: 5,
    };

    it('should create a new material and return 201', async () => {
      // 機材の存在確認をモック
      prismaMock.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer Pro', type: 'Mixer', manufacturer: 'ProAudio', memo: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'equip-2', name: 'Headphones Deluxe', type: 'Headphones', manufacturer: 'AudioTech', memo: null, createdAt: new Date(), updatedAt: new Date() }
      ]);

      const dynamicFilePath = `/uploads/materials/${uuidv4()}.wav`; // 動的なファイルパスを生成
      const createdMaterialResponse = {
        id: 'mat-created',
        slug: 'new-sound',
        title: validMaterialData.title,
        filePath: dynamicFilePath, // expect.stringMatching から具体的な文字列に変更
        recordedAt: new Date(validMaterialData.recordedAt),
        memo: validMaterialData.memo,
        fileFormat: validMaterialData.fileFormat,
        sampleRate: validMaterialData.sampleRate,
        bitDepth: validMaterialData.bitDepth,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [
          { id: 'tag-new', name: 'new', slug:'new', createdAt: new Date(), updatedAt: new Date(), materials: [] },
          { id: 'tag-test', name: 'test', slug:'test', createdAt: new Date(), updatedAt: new Date(), materials: [] }
        ],
        equipments: [
          { id: 'equip-1', name: 'Mixer Pro', type: 'Mixer', manufacturer: 'ProAudio', memo: null, createdAt: new Date(), updatedAt: new Date() },
          { id: 'equip-2', name: 'Headphones Deluxe', type: 'Headphones', manufacturer: 'AudioTech', memo: null, createdAt: new Date(), updatedAt: new Date()}
        ],
        latitude: null,
        longitude: null,
        locationName: null,
        rating: validMaterialData.rating,
        projects: []
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.material.create.mockResolvedValue(createdMaterialResponse as any);

      const request = createMockRequest('POST', validMaterialData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.title).toBe(validMaterialData.title);
      expect(responseBody.slug).toBe('new-sound');
      expect(responseBody.filePath).toBe(dynamicFilePath); // toMatch から toBe に変更し、具体的な値を比較
      expect(responseBody.tags).toHaveLength(2);
      expect(responseBody.tags[0].name).toBe('new');
      expect(prismaMock.material.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.material.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: validMaterialData.title,
          filePath: expect.stringMatching(/^\/uploads\/materials\/test-dummy-[a-f0-9-]+\.wav$/),
          memo: validMaterialData.memo,
          slug: 'new-sound',
          recordedAt: expect.any(Date),
          fileFormat: validMaterialData.fileFormat,
          sampleRate: validMaterialData.sampleRate,
          bitDepth: validMaterialData.bitDepth,
          latitude: null,
          longitude: null,
          locationName: null,
          rating: validMaterialData.rating,
          tags: {
            connectOrCreate: [
              { where: { name: 'new' }, create: { name: 'new', slug: 'new' } },
              { where: { name: 'test' }, create: { name: 'test', slug: 'test' } },
            ],
          },
          equipments: {
            connect: [
              { id: 'equip-1' },
              { id: 'equip-2' },
            ]
          }
        }),
        include: { tags: true, equipments: true },
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const request = createMockRequest('POST', { title: 'Incomplete', /* recordedAt と file を意図的に欠落 */ });
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Missing required fields: title, recordedAt, and file');
      expect(prismaMock.material.create).not.toHaveBeenCalled();
    });

    it('should return 409 if slug already exists', async () => {
      // 機材の存在確認をモック
      prismaMock.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer Pro', type: 'Mixer', manufacturer: 'ProAudio', memo: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'equip-2', name: 'Headphones Deluxe', type: 'Headphones', manufacturer: 'AudioTech', memo: null, createdAt: new Date(), updatedAt: new Date() }
      ]);

      prismaMock.material.create.mockRejectedValue({
          code: 'P2002',
          meta: { target: ['slug'] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, // PrismaClientKnownRequestError を模倣するために any を使用
      );

      const request = createMockRequest('POST', validMaterialData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Failed to create material: Slug already exists. Please change the title.');
      expect(prismaMock.material.create).toHaveBeenCalledTimes(1);
    });

    it('should return 500 for other database errors on create', async () => {
      // 機材の存在確認をモック
      prismaMock.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer Pro', type: 'Mixer', manufacturer: 'ProAudio', memo: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'equip-2', name: 'Headphones Deluxe', type: 'Headphones', manufacturer: 'AudioTech', memo: null, createdAt: new Date(), updatedAt: new Date() }
      ]);

      prismaMock.material.create.mockRejectedValue(new Error('Some other DB error'));
      const request = createMockRequest('POST', validMaterialData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to create material');
      expect(prismaMock.material.create).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid equipment IDs', async () => {
      // 存在しない機材IDを含む場合
      const invalidEquipmentData = {
        ...validMaterialData,
        equipmentIds: ['equip-1', 'invalid-equip']
      };

      // 一部のIDのみ存在する機材をモック
      prismaMock.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer Pro', type: 'Mixer', manufacturer: 'ProAudio', memo: null, createdAt: new Date(), updatedAt: new Date() }
      ]);

      const request = createMockRequest('POST', invalidEquipmentData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid equipment IDs: invalid-equip');
      expect(prismaMock.material.create).not.toHaveBeenCalled();
    });

    it('should handle empty equipment IDs array', async () => {
      const noEquipmentData = {
        ...validMaterialData,
        equipmentIds: []
      };

      const dynamicFilePath = `/uploads/materials/${uuidv4()}.wav`;
      const createdMaterialResponse = {
        id: 'mat-created',
        slug: 'new-sound',
        title: noEquipmentData.title,
        filePath: dynamicFilePath,
        recordedAt: new Date(noEquipmentData.recordedAt),
        memo: noEquipmentData.memo,
        fileFormat: noEquipmentData.fileFormat,
        sampleRate: noEquipmentData.sampleRate,
        bitDepth: noEquipmentData.bitDepth,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [
          { id: 'tag-new', name: 'new', slug:'new', createdAt: new Date(), updatedAt: new Date(), materials: [] },
          { id: 'tag-test', name: 'test', slug:'test', createdAt: new Date(), updatedAt: new Date(), materials: [] }
        ],
        equipments: [], // 空の配列
        latitude: null,
        longitude: null,
        locationName: null,
        rating: noEquipmentData.rating,
        projects: []
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.material.create.mockResolvedValue(createdMaterialResponse as any);

      const request = createMockRequest('POST', noEquipmentData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.equipments).toHaveLength(0);
      expect(prismaMock.material.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          equipments: {
            connect: []
          }
        }),
        include: { tags: true, equipments: true },
      });
    });
  });
}); 
