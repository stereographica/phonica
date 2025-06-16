/**
 * @jest-environment node
 */
import { GET, PUT, DELETE } from '@/app/api/projects/[slug]/route';
import { prismaMock } from '../../../../../../jest.setup';
import { NextRequest } from 'next/server';

function createMockRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const url = new URL(`http://localhost/api/projects/nature-sounds`);
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

describe('/api/projects/[slug]', () => {
  describe('GET', () => {
    const mockProject = {
      id: 'proj-1',
      slug: 'nature-sounds',
      name: 'Nature Sounds',
      description: 'Collection of natural sounds',
      createdAt: new Date('2023-01-15T10:00:00Z'),
      updatedAt: new Date('2023-01-15T10:00:00Z'),
      materials: [
        {
          id: 'mat1',
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

    it('should return a project with its materials', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      const request = createMockRequest('GET');
      const context = createMockContext('nature-sounds');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.id).toBe('proj-1');
      expect(responseBody.name).toBe('Nature Sounds');
      expect(responseBody.materialsCount).toBe(1);
      expect(responseBody.materials).toHaveLength(1);
      expect(responseBody.materials[0].title).toBe('Bird Song');
      expect(responseBody.materials[0].recordedAt).toBe('2023-01-10T08:00:00.000Z');
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        include: {
          materials: {
            select: {
              id: true,
              slug: true,
              title: true,
              filePath: true,
              fileFormat: true,
              recordedAt: true,
              locationName: true,
              rating: true,
              memo: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              materials: true,
            },
          },
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

    it('should return 500 if database error occurs', async () => {
      prismaMock.project.findUnique.mockRejectedValue(new Error('DB Error'));

      const request = createMockRequest('GET');
      const context = createMockContext('nature-sounds');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
    });
  });

  describe('PUT', () => {
    const mockUpdatedProject = {
      id: 'proj-1',
      slug: 'updated-nature-sounds',
      name: 'Updated Nature Sounds',
      description: 'Updated collection of natural sounds',
      createdAt: new Date('2023-01-15T10:00:00Z'),
      updatedAt: new Date('2023-01-16T10:00:00Z'),
      materials: [],
      _count: { materials: 0 },
    };

    it('should update a project successfully', async () => {
      prismaMock.project.update.mockResolvedValue(mockUpdatedProject);

      const updateData = {
        name: 'Updated Nature Sounds',
        description: 'Updated collection of natural sounds',
      };

      const request = createMockRequest('PUT', updateData);
      const context = createMockContext('nature-sounds');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.name).toBe('Updated Nature Sounds');
      expect(responseBody.slug).toBe('updated-nature-sounds');
      expect(responseBody.description).toBe('Updated collection of natural sounds');
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        data: {
          name: 'Updated Nature Sounds',
          slug: 'updated-nature-sounds',
          description: 'Updated collection of natural sounds',
        },
        include: expect.any(Object),
      });
    });

    it('should update only the name and generate new slug', async () => {
      const updatedProjectWithOnlyName = {
        ...mockUpdatedProject,
        name: 'Only Name Updated',
        slug: 'only-name-updated',
        description: 'Collection of natural sounds', // 元の説明のまま
      };
      prismaMock.project.update.mockResolvedValue(updatedProjectWithOnlyName);

      const updateData = {
        name: 'Only Name Updated',
      };

      const request = createMockRequest('PUT', updateData);
      const context = createMockContext('nature-sounds');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.name).toBe('Only Name Updated');
      expect(responseBody.slug).toBe('only-name-updated');
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        data: {
          name: 'Only Name Updated',
          slug: 'only-name-updated',
        },
        include: expect.any(Object),
      });
    });

    it('should update description to null', async () => {
      const updatedProjectWithNullDescription = {
        ...mockUpdatedProject,
        description: null,
      };
      prismaMock.project.update.mockResolvedValue(updatedProjectWithNullDescription);

      const updateData = {
        description: null,
      };

      const request = createMockRequest('PUT', updateData);
      const context = createMockContext('nature-sounds');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.description).toBe(null);
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        data: {
          description: null,
        },
        include: expect.any(Object),
      });
    });

    it('should return 400 for invalid request body', async () => {
      const request = createMockRequest('PUT', { name: '' }); // 空の名前
      const context = createMockContext('nature-sounds');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request body');
      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should return 404 if project not found', async () => {
      prismaMock.project.update.mockRejectedValue({ code: 'P2025' });

      const request = createMockRequest('PUT', { name: 'Updated Name' });
      const context = createMockContext('non-existent');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Project not found');
    });

    it('should return 409 if slug already exists', async () => {
      prismaMock.project.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['slug'] },
      });

      const request = createMockRequest('PUT', { name: 'Duplicate Name' });
      const context = createMockContext('nature-sounds');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe(
        'Failed to update project: Slug already exists. Please change the name.',
      );
    });
  });

  describe('DELETE', () => {
    const mockProject = {
      id: 'proj-1',
      name: 'Nature Sounds',
      slug: 'nature-sounds',
      description: 'Test project',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a project successfully', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
          return await callback(prismaMock);
        },
      );
      prismaMock.project.update.mockResolvedValue(mockProject);
      prismaMock.project.delete.mockResolvedValue(mockProject);

      const request = createMockRequest('DELETE');
      const context = createMockContext('nature-sounds');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Project deleted successfully');
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        select: { id: true, name: true },
      });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should return 404 if project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const request = createMockRequest('DELETE');
      const context = createMockContext('non-existent');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Project not found');
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid project slug', async () => {
      const request = createMockRequest('DELETE');
      const context = createMockContext('');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid project slug in URL');
    });

    it('should return 500 if database error occurs during deletion', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.$transaction.mockRejectedValue(new Error('DB Transaction Error'));

      const request = createMockRequest('DELETE');
      const context = createMockContext('nature-sounds');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
    });
  });
});
