/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/master/tags/route';
import { prismaMock } from '../../../../../../jest.setup';
import { NextRequest } from 'next/server';
import { Tag, Prisma } from '@prisma/client';
import { generateUniqueSlug } from '@/lib/slug-generator';

// slug-generatorをモック
jest.mock('@/lib/slug-generator');
const mockGenerateUniqueSlug = generateUniqueSlug as jest.MockedFunction<typeof generateUniqueSlug>;

// タグ数込みの型定義
type TagWithCount = Tag & {
  _count: {
    materials: number;
  };
};

function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: URLSearchParams,
): NextRequest {
  const url = new URL(
    `http://localhost/api/master/tags${searchParams ? `?${searchParams.toString()}` : ''}`,
  );
  const request = new Request(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return request as NextRequest;
}

describe('/api/master/tags', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // generateUniqueSlugのモック実装
    mockGenerateUniqueSlug.mockImplementation(async (name: string) => {
      return Promise.resolve(
        name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, ''),
      );
    });
  });

  describe('GET', () => {
    const mockTags: TagWithCount[] = [
      {
        id: 'tag1',
        slug: 'nature',
        name: 'Nature',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { materials: 5 },
      },
      {
        id: 'tag2',
        slug: 'urban',
        name: 'Urban',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        _count: { materials: 3 },
      },
    ];

    it('should return a list of tags with default pagination', async () => {
      prismaMock.tag.findMany.mockResolvedValue(mockTags);
      prismaMock.tag.count.mockResolvedValue(2);

      const request = createMockRequest('GET');
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.tags).toHaveLength(2);
      expect(responseBody.tags[0].name).toBe('Nature');
      expect(responseBody.tags[0]._count.materials).toBe(5);
      expect(responseBody.pagination).toEqual({
        page: 1,
        limit: 50,
        totalCount: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      expect(prismaMock.tag.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 50,
      });
    });

    it('should return tags with custom pagination and sorting', async () => {
      prismaMock.tag.findMany.mockResolvedValue([mockTags[0]]);
      prismaMock.tag.count.mockResolvedValue(2);

      const searchParams = new URLSearchParams({
        page: '2',
        limit: '1',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const request = createMockRequest('GET', undefined, searchParams);
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.pagination).toEqual({
        page: 2,
        limit: 1,
        totalCount: 2,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      });

      expect(prismaMock.tag.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 1,
        take: 1,
      });
    });

    it('should filter tags by name', async () => {
      prismaMock.tag.findMany.mockResolvedValue([mockTags[0]]);
      prismaMock.tag.count.mockResolvedValue(1);

      const searchParams = new URLSearchParams({ name: 'nat' });
      const request = createMockRequest('GET', undefined, searchParams);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.tag.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'nat',
            mode: 'insensitive',
          },
        },
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 50,
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const searchParams = new URLSearchParams({
        page: '-1',
        sortBy: 'invalid_field',
      });
      const request = createMockRequest('GET', undefined, searchParams);
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid query parameters');
      expect(responseBody.details).toBeDefined();
    });

    it('should return 500 if Prisma query fails', async () => {
      prismaMock.tag.findMany.mockRejectedValue(new Error('DB Error'));

      const request = createMockRequest('GET');
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to fetch tags');
    });
  });

  describe('POST', () => {
    const validTagData = {
      name: 'New Nature Tag',
    };

    const createdTagResponse: TagWithCount = {
      id: 'tag3',
      slug: 'new-nature-tag',
      name: 'New Nature Tag',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { materials: 0 },
    };

    it('should create a new tag and return 201', async () => {
      prismaMock.tag.create.mockResolvedValue(createdTagResponse);

      const request = createMockRequest('POST', validTagData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.name).toBe(validTagData.name);
      expect(responseBody.slug).toBe('new-nature-tag');
      expect(responseBody._count.materials).toBe(0);

      expect(prismaMock.tag.create).toHaveBeenCalledWith({
        data: {
          name: 'New Nature Tag',
          slug: 'new-nature-tag',
        },
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
      });
    });

    it('should trim whitespace from tag name', async () => {
      const tagDataWithWhitespace = { name: '  Spaced Tag  ' };
      const expectedResponse = {
        ...createdTagResponse,
        name: 'Spaced Tag',
        slug: 'spaced-tag',
      };
      prismaMock.tag.create.mockResolvedValue(expectedResponse);

      const request = createMockRequest('POST', tagDataWithWhitespace);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.name).toBe('Spaced Tag');
      expect(prismaMock.tag.create).toHaveBeenCalledWith({
        data: {
          name: 'Spaced Tag',
          slug: 'spaced-tag',
        },
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
      });
    });

    it('should return 400 if name is missing', async () => {
      const request = createMockRequest('POST', {});
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid input');
      expect(responseBody.details).toBeDefined();
    });

    it('should return 400 if name is empty string', async () => {
      const request = createMockRequest('POST', { name: '' });
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid input');
    });

    it('should return 400 if name is too long', async () => {
      const longName = 'a'.repeat(51); // 50文字を超える
      const request = createMockRequest('POST', { name: longName });
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid input');
    });

    it('should return 409 if name already exists', async () => {
      const knownError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'mock.version',
        meta: { target: ['name'] },
      });
      prismaMock.tag.create.mockRejectedValue(knownError);

      const request = createMockRequest('POST', validTagData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('その名前のタグは既に存在しています');
    });

    it('should return 409 if slug already exists', async () => {
      const knownError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'mock.version',
        meta: { target: ['slug'] },
      });
      prismaMock.tag.create.mockRejectedValue(knownError);

      const request = createMockRequest('POST', validTagData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Slugの生成に失敗しました。もう一度お試しください。');
    });

    it('should return 500 for other database errors on create', async () => {
      prismaMock.tag.create.mockRejectedValue(new Error('Some other DB error'));

      const request = createMockRequest('POST', validTagData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('データベースエラーが発生しました');
    });
  });
});
