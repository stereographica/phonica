import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ProjectWithMaterials } from '@/types/project';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    material: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('POST /api/projects/[slug]/materials/batch-update', () => {
  const mockContext = {
    params: Promise.resolve({ slug: 'test-project' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject invalid project slug', async () => {
    const mockInvalidContext = {
      params: Promise.resolve({ slug: '' }),
    };

    const request = new NextRequest('http://localhost:3000/api/projects//materials/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add: [], remove: [] }),
    });

    const response = await POST(request, mockInvalidContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid project slug');
  });

  it('should reject invalid request body', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should reject when no operations to perform', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: [], remove: [] }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No operations to perform');
  });

  it('should return 404 if project not found', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: ['material-1'], remove: [] }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Project not found');
  });

  it('should validate materials to add exist', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'project-1',
      name: 'Test Project',
    });

    (prisma.material.findMany as jest.Mock).mockResolvedValue([
      { id: 'material-1' },
    ]);

    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: ['material-1', 'material-2'],
          remove: [],
        }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Materials not found: material-2');
  });

  it('should validate materials to remove are in project', async () => {
    (prisma.project.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'project-1',
        name: 'Test Project',
      })
      .mockResolvedValueOnce({
        materials: [{ id: 'material-1' }],
      });

    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: [],
          remove: ['material-1', 'material-2'],
        }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Materials not in project: material-2');
  });

  it('should successfully add materials to project', async () => {
    const mockProject = {
      id: 'project-1',
      name: 'Test Project',
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.material.findMany as jest.Mock).mockResolvedValue([
      { id: 'material-1' },
      { id: 'material-2' },
    ]);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      return fn({
        project: {
          update: jest.fn().mockResolvedValue(mockProject),
        },
      });
    });
    (prisma.material.count as jest.Mock).mockResolvedValue(5);

    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: ['material-1', 'material-2'],
          remove: [],
        }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      project: {
        id: 'project-1',
        name: 'Test Project',
        slug: 'test-project',
      },
      operations: {
        added: 2,
        removed: 0,
      },
      totalMaterials: 5,
    });
  });

  it('should successfully remove materials from project', async () => {
    const mockProject = {
      id: 'project-1',
      name: 'Test Project',
    };

    (prisma.project.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockProject)
      .mockResolvedValueOnce({
        materials: [{ id: 'material-1' }, { id: 'material-2' }],
      });

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      return fn({
        project: {
          update: jest.fn().mockResolvedValue(mockProject),
        },
      });
    });
    (prisma.material.count as jest.Mock).mockResolvedValue(3);

    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: [],
          remove: ['material-1', 'material-2'],
        }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      project: {
        id: 'project-1',
        name: 'Test Project',
        slug: 'test-project',
      },
      operations: {
        added: 0,
        removed: 2,
      },
      totalMaterials: 3,
    });
  });

  it('should handle both add and remove operations', async () => {
    const mockProject = {
      id: 'project-1',
      name: 'Test Project',
    };

    (prisma.project.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockProject)
      .mockResolvedValueOnce({
        materials: [{ id: 'material-2' }],
      });

    (prisma.material.findMany as jest.Mock).mockResolvedValue([
      { id: 'material-1' },
    ]);

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      return fn({
        project: {
          update: jest.fn().mockResolvedValue(mockProject),
        },
      });
    });
    (prisma.material.count as jest.Mock).mockResolvedValue(4);

    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: ['material-1'],
          remove: ['material-2'],
        }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      project: {
        id: 'project-1',
        name: 'Test Project',
        slug: 'test-project',
      },
      operations: {
        added: 1,
        removed: 1,
      },
      totalMaterials: 4,
    });
  });

  it('should handle transaction errors', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'project-1',
      name: 'Test Project',
    });

    (prisma.material.findMany as jest.Mock).mockResolvedValue([
      { id: 'material-1' },
    ]);

    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error('Transaction failed')
    );

    const request = new NextRequest(
      'http://localhost:3000/api/projects/test-project/materials/batch-update',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: ['material-1'],
          remove: [],
        }),
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal Server Error');
    expect(data.details).toBe('Transaction failed');
  });
});