import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { createMaterialForTest } from '@/lib/actions/materials';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/actions/materials');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findUnique: jest.fn(),
    },
  },
}));

describe('/api/materials/test', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set test environment
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  describe('GET', () => {
    it('returns 403 in production environment', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('This endpoint is only available in test/development environment');
    });

    it('returns material from database if exists', async () => {
      const mockMaterial = {
        id: 'db-material-id',
        slug: 'test',
        title: 'DB Test Material',
        memo: 'Test memo',
        recordedAt: new Date('2023-01-01'),
        filePath: '/uploads/test.wav',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 2,
        latitude: 35.6762,
        longitude: 139.6503,
        locationName: 'Test Location',
        rating: 5,
        tags: [{ id: 'tag1', name: 'Test Tag', slug: 'test-tag' }],
        equipments: [
          { id: 'eq1', name: 'Test Equipment', type: 'Recorder', manufacturer: 'Test Corp' },
        ],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(mockMaterial);

      const response = await GET();
      const data = await response.json();

      expect(prisma.material.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test' },
        include: { tags: true, equipments: true },
      });

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 'db-material-id',
        slug: 'test',
        title: 'DB Test Material',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
      });
    });

    it('returns dummy data if material not found', async () => {
      (prisma.material.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 'test-material-id',
        slug: 'test',
        title: 'Test Material',
        fileFormat: 'WAV',
      });
    });

    it('returns dummy data on database error', async () => {
      (prisma.material.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 'test-material-id',
        slug: 'test',
        title: 'Test Material',
      });
    });
  });

  describe('POST', () => {
    it('returns 403 in production environment', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      const request = new NextRequest('http://localhost:3000/api/materials/test', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('This endpoint is only available in test/development environment');
    });

    it('creates material successfully', async () => {
      const mockData = { title: 'Test Material' };
      const mockResult = { success: true, data: { id: '123', ...mockData } };

      (createMaterialForTest as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/materials/test', {
        method: 'POST',
      });
      // Mock request.json()
      request.json = jest.fn().mockResolvedValue(mockData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockResult.data);
    });

    it('returns error when creation fails', async () => {
      const mockData = { title: 'Test Material' };
      const mockResult = { success: false, error: 'Creation failed' };

      (createMaterialForTest as jest.Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/materials/test', {
        method: 'POST',
      });
      request.json = jest.fn().mockResolvedValue(mockData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Creation failed');
    });

    it('handles exceptions', async () => {
      const request = new NextRequest('http://localhost:3000/api/materials/test', {
        method: 'POST',
      });
      request.json = jest.fn().mockRejectedValue(new Error('Parse error'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Parse error');
    });
  });
});
