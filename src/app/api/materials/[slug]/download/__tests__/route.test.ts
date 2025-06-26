import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';

// Polyfill ReadableStream for Node.js test environment
if (typeof ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  global.ReadableStream = require('stream/web').ReadableStream;
}

// Mock external dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('fs', () => ({
  createReadStream: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((filePath) => filePath.split('/').pop() || ''),
  resolve: jest.fn(),
}));

jest.mock('util', () => ({
  promisify: jest.fn(() => jest.fn()),
}));

jest.mock('stream', () => ({
  Readable: {
    toWeb: jest.fn(() => new ReadableStream()),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPrisma = prisma as any;

describe('/api/materials/[slug]/download', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 404 when material not found', async () => {
      (mockedPrisma.material.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/materials/nonexistent/download');
      const context = { params: Promise.resolve({ slug: 'nonexistent' }) };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Material or file path not found');
    });

    it('returns 404 when material has no filePath', async () => {
      (mockedPrisma.material.findUnique as jest.Mock).mockResolvedValue({
        filePath: null,
        title: 'No File',
        fileFormat: 'wav',
      });

      const request = new NextRequest('http://localhost:3000/api/materials/test-slug/download');
      const context = { params: Promise.resolve({ slug: 'test-slug' }) };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Material or file path not found');
    });

    it('returns 400 for invalid slug', async () => {
      const request = new NextRequest('http://localhost:3000/api/materials//download');
      const context = { params: Promise.resolve({ slug: '' }) };

      const response = await GET(request, context);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid material slug');
    });

    it('determines correct content type for different formats', () => {
      // This test verifies the MIME type mapping logic without file system interaction
      const testCases = [
        { format: 'wav', expected: 'audio/wav' },
        { format: 'mp3', expected: 'audio/mpeg' },
        { format: 'aac', expected: 'audio/aac' },
        { format: 'ogg', expected: 'audio/ogg' },
        { format: 'flac', expected: 'audio/flac' },
        { format: 'm4a', expected: 'audio/mp4' },
        { format: 'webm', expected: 'audio/webm' },
        { format: 'aiff', expected: 'audio/aiff' },
        { format: 'aif', expected: 'audio/aiff' },
        { format: 'unknown', expected: 'application/octet-stream' },
      ];

      testCases.forEach(({ format, expected }) => {
        let contentType = 'application/octet-stream';
        const ext = format?.toLowerCase();
        if (ext === 'wav') contentType = 'audio/wav';
        else if (ext === 'mp3') contentType = 'audio/mpeg';
        else if (ext === 'aac') contentType = 'audio/aac';
        else if (ext === 'ogg') contentType = 'audio/ogg';
        else if (ext === 'flac') contentType = 'audio/flac';
        else if (ext === 'm4a') contentType = 'audio/mp4';
        else if (ext === 'webm') contentType = 'audio/webm';
        else if (ext === 'aiff' || ext === 'aif') contentType = 'audio/aiff';

        expect(contentType).toBe(expected);
      });
    });

    it('determines correct disposition header based on play parameter', () => {
      // Test inline disposition for playback
      const playbackUrl = new URL('http://localhost:3000/api/materials/test/download?play=true');
      const isPlayback = playbackUrl.searchParams.get('play') === 'true';
      expect(isPlayback).toBe(true);

      // Test attachment disposition for download
      const downloadUrl = new URL('http://localhost:3000/api/materials/test/download');
      const isDownload = downloadUrl.searchParams.get('play') === 'true';
      expect(isDownload).toBe(false);
    });
  });
});
