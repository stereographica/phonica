/**
 * @jest-environment node
 */
import { POST, GET } from '@/app/api/projects/[slug]/materials/route';
import { prismaMock } from '../../../../../../../jest.setup';
import { NextRequest } from 'next/server';

function createMockRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const url = new URL(`http://localhost/api/projects/nature-sounds/materials`);
  let requestBody: BodyInit | null | undefined = undefined;
  const headers = new Headers();

  if (body) {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      requestBody = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    }
  }

  const req = new NextRequest(url.toString(), {
    method,
    headers,
    body: requestBody,
  });

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    Object.defineProperty(req, 'json', {
      value: async () => body,
      writable: true,
      configurable: true,
    });
  }

  return req;
}

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function createMockContext(slug: string): RouteContext {
  return {
    params: Promise.resolve({ slug }),
  };
}

describe('/api/projects/[slug]/materials', () => {
  describe('POST', () => {
    const mockProject = {
      id: 'proj-1',
      name: 'Nature Sounds',
      slug: 'nature-sounds',
      description: 'Test project',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMaterial = {
      id: 'mat-1',
      title: 'Bird Song',
      slug: 'bird-song',
      filePath: '/test/path.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      recordedAt: new Date(),
      latitude: null,
      longitude: null,
      locationName: null,
      rating: 5,
      memo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      equipments: [],
      projects: [],
    };

    const mockUpdatedProject = {
      id: 'proj-1',
      slug: 'nature-sounds',
      name: 'Nature Sounds',
      description: 'Collection of natural sounds',
      createdAt: new Date('2023-01-15T10:00:00Z'),
      updatedAt: new Date('2023-01-16T10:00:00Z'),
      materials: [
        {
          id: 'mat-1',
          slug: 'bird-song',
          title: 'Bird Song',
          filePath: '/uploads/materials/bird-song.wav',
          fileFormat: 'WAV',
          recordedAt: new Date('2023-01-10T08:00:00Z'),
          locationName: 'Forest Park',
          rating: 5,
          memo: 'Beautiful morning bird sounds',
          createdAt: new Date('2023-01-10T08:00:00Z'),
          updatedAt: new Date('2023-01-10T08:00:00Z'),
        },
      ],
      _count: { materials: 1 },
    };

    it('should add a material to project successfully', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(mockMaterial);
      prismaMock.project.findFirst.mockResolvedValue(null); // 関連付けが存在しない
      prismaMock.project.update.mockResolvedValue(mockUpdatedProject);

      const requestBody = { materialId: 'mat-1' };
      const request = createMockRequest('POST', requestBody);
      const context = createMockContext('nature-sounds');
      const response = await POST(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.materialsCount).toBe(1);
      expect(responseBody.materials).toHaveLength(1);
      expect(responseBody.materials[0].title).toBe('Bird Song');
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        data: {
          materials: {
            connect: { id: 'mat-1' },
          },
        },
        include: expect.any(Object),
      });
    });

    it('should return 400 for invalid project slug', async () => {
      const request = createMockRequest('POST', { materialId: 'mat-1' });
      const context = createMockContext('');
      const response = await POST(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid project slug');
    });

    it('should return 400 for missing materialId', async () => {
      const request = createMockRequest('POST', {});
      const context = createMockContext('nature-sounds');
      const response = await POST(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request body');
      expect(responseBody.details).toBeDefined();
    });

    it('should return 404 if project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', { materialId: 'mat-1' });
      const context = createMockContext('non-existent');
      const response = await POST(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Project not found');
    });

    it('should return 404 if material not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(null);

      const request = createMockRequest('POST', { materialId: 'non-existent' });
      const context = createMockContext('nature-sounds');
      const response = await POST(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
    });

    it('should return 409 if material is already associated with project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(mockMaterial);
      prismaMock.project.findFirst.mockResolvedValue(mockProject); // 関連付けが既に存在

      const request = createMockRequest('POST', { materialId: 'mat-1' });
      const context = createMockContext('nature-sounds');
      const response = await POST(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Material is already associated with this project');
      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should return 500 if database error occurs', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(mockMaterial);
      prismaMock.project.findFirst.mockResolvedValue(null);
      prismaMock.project.update.mockRejectedValue(new Error('DB Error'));

      const request = createMockRequest('POST', { materialId: 'mat-1' });
      const context = createMockContext('nature-sounds');
      const response = await POST(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
    });
  });

  describe('GET', () => {
    const mockProject = {
      id: 'proj-1',
      slug: 'nature-sounds',
      name: 'Nature Sounds',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMaterials = [
      {
        id: 'mat1',
        slug: 'bird-song',
        title: 'Bird Song',
        filePath: '/uploads/materials/bird-song.wav',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 180,
        channels: 2,
        recordedAt: new Date('2023-01-10T08:00:00Z'),
        latitude: null,
        longitude: null,
        locationName: null,
        memo: null,
        rating: 5,
        createdAt: new Date('2023-01-10T08:00:00Z'),
        updatedAt: new Date('2023-01-10T08:00:00Z'),
        tags: [
          { id: 'tag1', name: 'Nature', slug: 'nature' },
          { id: 'tag2', name: 'Birds', slug: 'birds' },
        ],
      },
      {
        id: 'mat2',
        slug: 'river-flow',
        title: 'River Flow',
        filePath: '/uploads/materials/river-flow.wav',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 240,
        channels: 2,
        recordedAt: new Date('2023-01-15T10:00:00Z'),
        latitude: null,
        longitude: null,
        locationName: null,
        memo: null,
        rating: 4,
        createdAt: new Date('2023-01-15T10:00:00Z'),
        updatedAt: new Date('2023-01-15T10:00:00Z'),
        tags: [
          { id: 'tag1', name: 'Nature', slug: 'nature' },
          { id: 'tag3', name: 'Water', slug: 'water' },
        ],
      },
    ];

    it('should return materials for a project with pagination', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findMany.mockResolvedValue(mockMaterials);
      prismaMock.material.count.mockResolvedValue(2);

      const request = createMockRequest('GET');
      const context = createMockContext('nature-sounds');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(2);
      expect(responseBody.data[0].title).toBe('Bird Song');
      expect(responseBody.data[1].title).toBe('River Flow');
      expect(responseBody.pagination).toEqual({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 2,
      });
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        select: { id: true },
      });
      expect(prismaMock.material.findMany).toHaveBeenCalledWith({
        where: {
          projects: {
            some: {
              slug: 'nature-sounds',
            },
          },
        },
        skip: 0,
        take: 10,
        include: {
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          recordedAt: 'desc',
        },
      });
    });

    it('should return 404 if project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const request = createMockRequest('GET');
      const context = createMockContext('non-existent');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Project not found');
    });

    it('should return 400 for invalid project slug', async () => {
      const request = createMockRequest('GET');
      const context = createMockContext('');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid project slug');
    });

    it('should handle pagination parameters', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findMany.mockResolvedValue([mockMaterials[1]]);
      prismaMock.material.count.mockResolvedValue(2);

      const url = new URL(`http://localhost/api/projects/nature-sounds/materials?page=2&limit=1`);
      const req = new NextRequest(url.toString(), { method: 'GET' });

      const context = createMockContext('nature-sounds');
      const response = await GET(req, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].title).toBe('River Flow');
      expect(responseBody.pagination).toEqual({
        page: 2,
        limit: 1,
        totalPages: 2,
        totalItems: 2,
      });
      expect(prismaMock.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        }),
      );
    });
  });
});
