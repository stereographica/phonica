/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/projects/route';
import { prismaMock } from '../../../../../jest.setup';
import { NextRequest } from 'next/server';
// Mock types for testing

function createMockRequest(
  method: string, 
  body?: Record<string, unknown>,
  searchParams?: URLSearchParams
): NextRequest {
  const url = new URL(`http://localhost/api/projects${searchParams ? '?' + searchParams.toString() : ''}`);
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
      configurable: true
    });
  }

  return req;
}

describe('/api/projects', () => {
  describe('GET', () => {
    const baseMockProjects = [
      {
        id: 'proj1',
        slug: 'nature-sounds',
        name: 'Nature Sounds',
        description: 'Collection of natural sounds',
        createdAt: new Date('2023-01-15T10:00:00Z'),
        updatedAt: new Date('2023-01-15T10:00:00Z'),
        materials: [
          { id: 'mat1', title: 'Bird Song', slug: 'bird-song' },
          { id: 'mat2', title: 'River Flow', slug: 'river-flow' }
        ],
        _count: { materials: 2 }
      },
      {
        id: 'proj2',
        slug: 'urban-ambience',
        name: 'Urban Ambience',
        description: 'City soundscapes',
        createdAt: new Date('2023-02-20T14:30:00Z'),
        updatedAt: new Date('2023-02-20T14:30:00Z'),
        materials: [
          { id: 'mat3', title: 'Traffic Noise', slug: 'traffic-noise' }
        ],
        _count: { materials: 1 }
      },
      {
        id: 'proj3',
        slug: 'experimental',
        name: 'Experimental',
        description: null,
        createdAt: new Date('2023-03-10T08:00:00Z'),
        updatedAt: new Date('2023-03-10T08:00:00Z'),
        materials: [],
        _count: { materials: 0 }
      },
    ];

    beforeEach(() => {
      (prismaMock.project.findMany as jest.Mock).mockImplementation(async (args?: unknown) => {
        let filteredProjects = [...baseMockProjects];
        
        if (args && typeof args === 'object' && 'where' in args && args.where && 
            typeof args.where === 'object' && 'name' in args.where && args.where.name &&
            typeof args.where.name === 'object' && 'contains' in args.where.name) {
          const nameQuery = (args.where.name as { contains: string; mode?: string }).contains.toLowerCase();
          filteredProjects = filteredProjects.filter(p => p.name.toLowerCase().includes(nameQuery));
        }

        if (args && typeof args === 'object' && 'orderBy' in args && args.orderBy && typeof args.orderBy === 'object' && !Array.isArray(args.orderBy)) {
          const [[sortBy, sortOrder]] = Object.entries(args.orderBy);
          const key = sortBy as keyof typeof baseMockProjects[0];
          filteredProjects.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal == null || bVal == null) return 0;
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }

        const skip = (args && typeof args === 'object' && 'skip' in args ? Number(args.skip) : 0) || 0;
        const take = (args && typeof args === 'object' && 'take' in args ? Number(args.take) : 10) || 10;
        return filteredProjects.slice(skip, skip + take);
      });
       
      (prismaMock.project.count as jest.Mock).mockImplementation(async (args?: unknown) => {
        let filteredProjects = [...baseMockProjects];
        if (args && typeof args === 'object' && 'where' in args && args.where && 
            typeof args.where === 'object' && 'name' in args.where && args.where.name &&
            typeof args.where.name === 'object' && 'contains' in args.where.name) {
          const nameQuery = (args.where.name as { contains: string; mode?: string }).contains.toLowerCase();
          filteredProjects = filteredProjects.filter(p => p.name.toLowerCase().includes(nameQuery));
        }
        return filteredProjects.length;
      });
    });

    it('should return a list of projects with default pagination and sorting', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(3);
      expect(responseBody.data[0].name).toBe('Experimental');
      expect(responseBody.data[0].materialsCount).toBe(0);
      expect(responseBody.data[0].materials).toBeDefined();
      expect(responseBody.pagination.page).toBe(1);
      expect(responseBody.pagination.limit).toBe(10);
      expect(responseBody.pagination.totalPages).toBe(1);
      expect(responseBody.pagination.totalItems).toBe(3);
      expect(prismaMock.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          materials: {
            select: {
              id: true,
              title: true,
              slug: true,
            }
          },
          _count: {
            select: {
              materials: true,
            }
          }
        },
        where: {}
      }));
      expect(prismaMock.project.count).toHaveBeenCalledWith({where: {}});
    });

    it('should handle page and limit parameters', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ page: '2', limit: '1' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].name).toBe('Urban Ambience');
      expect(responseBody.pagination.page).toBe(2);
      expect(responseBody.pagination.limit).toBe(1);
      expect(responseBody.pagination.totalPages).toBe(3);
      expect(prismaMock.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 1,
        take: 1,
      }));
    });

    it('should handle sortBy and sortOrder parameters (name asc)', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ sortBy: 'name', sortOrder: 'asc' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(3);
      expect(responseBody.data[0].name).toBe('Experimental');
      expect(prismaMock.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { name: 'asc' },
      }));
    });

    it('should filter by name (case-insensitive)', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ name: 'nature' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].name).toBe('Nature Sounds');
      expect(prismaMock.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { name: { contains: 'nature', mode: 'insensitive' } },
      }));
    });

    it('should return 400 for invalid query parameters', async () => {
      const request = createMockRequest('GET', undefined, new URLSearchParams({ page: 'invalidPage' }));
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid query parameters');
      expect(responseBody.details).toBeDefined();
    });

    it('should return 500 if Prisma query fails', async () => {
      prismaMock.project.findMany.mockRejectedValue(new Error('DB Error'));
      const request = createMockRequest('GET');
      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to fetch projects');
    });
  });

  describe('POST', () => {
    const validProjectData = {
      name: 'New Project',
      description: 'A new project for testing',
    };

    it('should create a new project and return 201', async () => {
      const createdProjectResponse = {
        id: 'proj-created',
        slug: 'new-project',
        name: validProjectData.name,
        description: validProjectData.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        materials: [],
        _count: { materials: 0 }
      };
      prismaMock.project.create.mockResolvedValue(createdProjectResponse);

      const request = createMockRequest('POST', validProjectData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.name).toBe(validProjectData.name);
      expect(responseBody.slug).toBe('new-project');
      expect(responseBody.description).toBe(validProjectData.description);
      expect(responseBody.materialsCount).toBe(0);
      expect(responseBody.materials).toHaveLength(0);
      expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.project.create).toHaveBeenCalledWith({
        data: {
          name: validProjectData.name,
          slug: 'new-project',
          description: validProjectData.description,
        },
        include: {
          materials: {
            select: {
              id: true,
              title: true,
              slug: true,
            }
          },
          _count: {
            select: {
              materials: true,
            }
          }
        },
      });
    });

    it('should create a project with null description', async () => {
      const projectDataWithNullDescription = {
        name: 'Project Without Description',
        description: null,
      };

      const createdProjectResponse = {
        id: 'proj-created',
        slug: 'project-without-description',
        name: projectDataWithNullDescription.name,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        materials: [],
        _count: { materials: 0 }
      };
      prismaMock.project.create.mockResolvedValue(createdProjectResponse);

      const request = createMockRequest('POST', projectDataWithNullDescription);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.description).toBe(null);
      expect(prismaMock.project.create).toHaveBeenCalledWith({
        data: {
          name: projectDataWithNullDescription.name,
          slug: 'project-without-description',
          description: null,
        },
        include: expect.any(Object),
      });
    });

    it('should return 400 if name is missing', async () => {
      const request = createMockRequest('POST', { description: 'No name provided' });
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request body');
      expect(responseBody.details).toBeDefined();
      expect(prismaMock.project.create).not.toHaveBeenCalled();
    });

    it('should return 409 if slug already exists', async () => {
      prismaMock.project.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['slug'] },
      } as Error & { code: string; meta: { target: string[] } });

      const request = createMockRequest('POST', validProjectData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Failed to create project: Slug already exists. Please change the name.');
      expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
    });

    it('should return 500 for other database errors on create', async () => {
      prismaMock.project.create.mockRejectedValue(new Error('Some other DB error'));
      const request = createMockRequest('POST', validProjectData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to create project');
      expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
    });
  });
});