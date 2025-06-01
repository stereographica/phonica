/**
 * @jest-environment node
 */
import { GET, PUT, DELETE } from '@/app/api/master/tags/[id]/route';
import { prismaMock } from '../../../../../../jest.setup';
import { Tag, Prisma } from '@prisma/client';

// タグ数込みの型定義
type TagWithCount = Tag & {
  _count: {
    materials: number;
  };
};

function createMockRequest(method: string, body?: Record<string, unknown>): Request {
  const request = new Request('http://localhost/api/master/tags/tag1', {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return request;
}

function createMockContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

describe('/api/master/tags/[id]', () => {
  const mockTag: TagWithCount = {
    id: 'tag1',
    slug: 'nature',
    name: 'Nature',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    _count: { materials: 5 },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET', () => {
    it('should return a specific tag with material count', async () => {
      prismaMock.tag.findUnique.mockResolvedValue(mockTag);

      const request = createMockRequest('GET');
      const context = createMockContext('tag1');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.id).toBe('tag1');
      expect(responseBody.name).toBe('Nature');
      expect(responseBody._count.materials).toBe(5);
      
      expect(prismaMock.tag.findUnique).toHaveBeenCalledWith({
        where: { id: 'tag1' },
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
      });
    });

    it('should return 404 if tag not found', async () => {
      prismaMock.tag.findUnique.mockResolvedValue(null);

      const request = createMockRequest('GET');
      const context = createMockContext('nonexistent');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Tag not found');
    });

    it('should return 500 if Prisma query fails', async () => {
      prismaMock.tag.findUnique.mockRejectedValue(new Error('DB Error'));

      const request = createMockRequest('GET');
      const context = createMockContext('tag1');
      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to fetch tag tag1');
    });
  });

  describe('PUT', () => {
    const validUpdateData = {
      name: 'Updated Nature',
    };

    const updatedTagResponse: TagWithCount = {
      ...mockTag,
      name: 'Updated Nature',
      slug: 'updated-nature',
      updatedAt: new Date('2024-01-02'),
    };

    it('should update a tag and return the updated data', async () => {
      prismaMock.tag.update.mockResolvedValue(updatedTagResponse);

      const request = createMockRequest('PUT', validUpdateData);
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.name).toBe('Updated Nature');
      expect(responseBody.slug).toBe('updated-nature');
      expect(responseBody._count.materials).toBe(5);
      
      expect(prismaMock.tag.update).toHaveBeenCalledWith({
        where: { id: 'tag1' },
        data: {
          name: 'Updated Nature',
          slug: 'updated-nature',
          updatedAt: expect.any(Date),
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
      const updateDataWithWhitespace = { name: '  Spaced Update  ' };
      const expectedResponse = {
        ...updatedTagResponse,
        name: 'Spaced Update',
        slug: 'spaced-update',
      };
      prismaMock.tag.update.mockResolvedValue(expectedResponse);

      const request = createMockRequest('PUT', updateDataWithWhitespace);
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.name).toBe('Spaced Update');
      expect(prismaMock.tag.update).toHaveBeenCalledWith({
        where: { id: 'tag1' },
        data: {
          name: 'Spaced Update',
          slug: 'spaced-update',
          updatedAt: expect.any(Date),
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
      const request = createMockRequest('PUT', {});
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid input');
      expect(responseBody.details).toBeDefined();
    });

    it('should return 400 if name is empty string', async () => {
      const request = createMockRequest('PUT', { name: '' });
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid input');
    });

    it('should return 400 if name is too long', async () => {
      const longName = 'a'.repeat(51); // 50文字を超える
      const request = createMockRequest('PUT', { name: longName });
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid input');
    });

    it('should return 404 if tag not found', async () => {
      const knownError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: 'mock.version', meta: {} }
      );
      prismaMock.tag.update.mockRejectedValue(knownError);

      const request = createMockRequest('PUT', validUpdateData);
      const context = createMockContext('nonexistent');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Tag with id nonexistent not found');
    });

    it('should return 409 if name already exists', async () => {
      const knownError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'mock.version', meta: { target: ['name'] } }
      );
      prismaMock.tag.update.mockRejectedValue(knownError);

      const request = createMockRequest('PUT', validUpdateData);
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Tag with this name already exists');
    });

    it('should return 409 if slug already exists', async () => {
      const knownError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'mock.version', meta: { target: ['slug'] } }
      );
      prismaMock.tag.update.mockRejectedValue(knownError);

      const request = createMockRequest('PUT', validUpdateData);
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Tag with this slug already exists');
    });

    it('should return 500 for other database errors', async () => {
      prismaMock.tag.update.mockRejectedValue(new Error('Some other DB error'));

      const request = createMockRequest('PUT', validUpdateData);
      const context = createMockContext('tag1');
      const response = await PUT(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to update tag tag1');
    });
  });

  describe('DELETE', () => {
    it('should delete a tag when no materials are using it', async () => {
      const tagWithoutMaterials = { ...mockTag, _count: { materials: 0 } };
      prismaMock.tag.findUnique.mockResolvedValue(tagWithoutMaterials);
      prismaMock.tag.delete.mockResolvedValue(tagWithoutMaterials);

      const request = createMockRequest('DELETE');
      const context = createMockContext('tag1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Tag deleted successfully');
      
      expect(prismaMock.tag.findUnique).toHaveBeenCalledWith({
        where: { id: 'tag1' },
        include: {
          _count: {
            select: {
              materials: true,
            },
          },
        },
      });
      expect(prismaMock.tag.delete).toHaveBeenCalledWith({
        where: { id: 'tag1' },
      });
    });

    it('should return 404 if tag not found', async () => {
      prismaMock.tag.findUnique.mockResolvedValue(null);

      const request = createMockRequest('DELETE');
      const context = createMockContext('nonexistent');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Tag with id nonexistent not found');
      expect(prismaMock.tag.delete).not.toHaveBeenCalled();
    });

    it('should return 409 if tag has associated materials', async () => {
      prismaMock.tag.findUnique.mockResolvedValue(mockTag); // 5つの素材が関連

      const request = createMockRequest('DELETE');
      const context = createMockContext('tag1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Cannot delete tag: 5 material(s) are still using this tag');
      expect(responseBody.materialCount).toBe(5);
      expect(prismaMock.tag.delete).not.toHaveBeenCalled();
    });

    it('should return 404 if tag not found during delete operation', async () => {
      const tagWithoutMaterials = { ...mockTag, _count: { materials: 0 } };
      prismaMock.tag.findUnique.mockResolvedValue(tagWithoutMaterials);
      
      const knownError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: 'mock.version', meta: {} }
      );
      prismaMock.tag.delete.mockRejectedValue(knownError);

      const request = createMockRequest('DELETE');
      const context = createMockContext('tag1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Tag with id tag1 not found');
    });

    it('should return 500 for other database errors during lookup', async () => {
      prismaMock.tag.findUnique.mockRejectedValue(new Error('DB Error'));

      const request = createMockRequest('DELETE');
      const context = createMockContext('tag1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to delete tag tag1');
    });

    it('should return 500 for other database errors during delete', async () => {
      const tagWithoutMaterials = { ...mockTag, _count: { materials: 0 } };
      prismaMock.tag.findUnique.mockResolvedValue(tagWithoutMaterials);
      prismaMock.tag.delete.mockRejectedValue(new Error('Some other DB error'));

      const request = createMockRequest('DELETE');
      const context = createMockContext('tag1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to delete tag tag1');
    });
  });
});