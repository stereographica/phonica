/**
 * @jest-environment node
 */
import { DELETE } from '@/app/api/projects/[slug]/materials/[materialId]/route';
import { prismaMock } from '../../../../../../../../jest.setup';
import { NextRequest } from 'next/server';

function createMockRequest(method: string): NextRequest {
  const url = new URL(`http://localhost/api/projects/nature-sounds/materials/mat-1`);

  return new NextRequest(url.toString(), {
    method,
  });
}

type RouteContext = {
  params: Promise<{ slug: string; materialId: string }>;
};

function createMockContext(slug: string, materialId: string): RouteContext {
  return {
    params: Promise.resolve({ slug, materialId }),
  };
}

describe('/api/projects/[slug]/materials/[materialId]', () => {
  describe('DELETE', () => {
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
      materials: [], // 素材削除後は空
      _count: { materials: 0 },
    };

    it('should remove a material from project successfully', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(mockMaterial);
      prismaMock.project.findFirst.mockResolvedValue(mockProject); // 関連付けが存在
      prismaMock.project.update.mockResolvedValue(mockUpdatedProject);

      const request = createMockRequest('DELETE');
      const context = createMockContext('nature-sounds', 'mat-1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.materialsCount).toBe(0);
      expect(responseBody.materials).toHaveLength(0);
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { slug: 'nature-sounds' },
        data: {
          materials: {
            disconnect: { id: 'mat-1' },
          },
        },
        include: expect.any(Object),
      });
    });

    it('should return 400 for invalid project slug', async () => {
      const request = createMockRequest('DELETE');
      const context = createMockContext('', 'mat-1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid project slug or material ID');
    });

    it('should return 400 for invalid material ID', async () => {
      const request = createMockRequest('DELETE');
      const context = createMockContext('nature-sounds', '');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid project slug or material ID');
    });

    it('should return 404 if project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const request = createMockRequest('DELETE');
      const context = createMockContext('non-existent', 'mat-1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Project not found');
    });

    it('should return 404 if material not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(null);

      const request = createMockRequest('DELETE');
      const context = createMockContext('nature-sounds', 'non-existent');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
    });

    it('should return 404 if material is not associated with project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(mockMaterial);
      prismaMock.project.findFirst.mockResolvedValue(null); // 関連付けが存在しない

      const request = createMockRequest('DELETE');
      const context = createMockContext('nature-sounds', 'mat-1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material is not associated with this project');
      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should return 500 if database error occurs', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.material.findUnique.mockResolvedValue(mockMaterial);
      prismaMock.project.findFirst.mockResolvedValue(mockProject);
      prismaMock.project.update.mockRejectedValue(new Error('DB Error'));

      const request = createMockRequest('DELETE');
      const context = createMockContext('nature-sounds', 'mat-1');
      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
    });
  });
});
