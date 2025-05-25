import { NextRequest } from 'next/server';
import { DELETE } from '../route';
import { prisma } from '@/lib/prisma';
import path from 'path';
import { deleteFile as actualDeleteFile } from '@/lib/file-system';
import fs from 'fs/promises';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/file-system', () => ({
  deleteFile: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'test-uuid-v4',
}));

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'materials');

describe('API Route: /api/materials/[slug]', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      material: {
        update: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 'test-id' }),
        findUnique: jest.fn(),
      },
      materialTag: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      materialEquipment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async (callback) => callback(mockTx));
    (prisma.material.findUnique as jest.Mock).mockReset();
    (actualDeleteFile as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    try {
      const files = await fs.readdir(UPLOADS_DIR);
      for (const file of files) {
        if (file.startsWith('test-dummy-')) {
          try {
            await fs.unlink(path.join(UPLOADS_DIR, file));
          } catch (err) {
            console.error(`Failed to delete dummy file ${file}:`, err);
          }
        }
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ENOENT') {
      } else {
        console.error('Error during dummy file cleanup:', err);
      }
    }
  });

  describe('DELETE', () => {
    it('should delete a material and its associated file', async () => {
      const mockSlug = 'test-material-to-delete';
      const mockFilePath = 'uploads/materials/test-file.wav';
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-id',
        slug: mockSlug,
        filePath: mockFilePath,
      });
      (actualDeleteFile as jest.Mock).mockResolvedValueOnce(undefined);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');

      expect(prisma.material.findUnique).toHaveBeenCalledWith({
        where: { slug: mockSlug },
        select: { id: true, filePath: true },
      });
      expect(mockTx.material.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          tags: { set: [] },
          equipments: { set: [] },
        },
      });
      expect(mockTx.material.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });

      const expectedAbsoluteFilePath = path.join(process.cwd(), 'public', mockFilePath);
      expect(actualDeleteFile).toHaveBeenCalledWith(expectedAbsoluteFilePath);
    });

    it('should return 404 if material to delete is not found', async () => {
      const mockSlug = 'non-existent-slug';
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
      expect(actualDeleteFile).not.toHaveBeenCalled();
      expect(mockTx.material.update).not.toHaveBeenCalled();
      expect(mockTx.material.delete).not.toHaveBeenCalled();
    });

    it('should return 200 even if file deletion fails (but logs error)', async () => {
      const mockSlug = 'material-file-delete-fail';
      const mockFilePath = 'uploads/materials/file-to-fail-delete.wav';
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-id-fail',
        slug: mockSlug,
        filePath: mockFilePath,
      });
      (actualDeleteFile as jest.Mock).mockRejectedValueOnce(new Error('Mock deleteFile error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');
      
      expect(mockTx.material.update).toHaveBeenCalledWith({
        where: { id: 'test-id-fail' },
        data: {
          tags: { set: [] },
          equipments: { set: [] },
        },
      });
      expect(mockTx.material.delete).toHaveBeenCalledWith({
        where: { id: 'test-id-fail' },
      });

      const expectedAbsoluteFilePath = path.join(process.cwd(), 'public', mockFilePath);
      expect(actualDeleteFile).toHaveBeenCalledWith(expectedAbsoluteFilePath);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to delete file ${mockFilePath}:`),
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should return 400 if slug is invalid', async () => {
      const request = new NextRequest('http://localhost/api/materials/ ', {
        method: 'DELETE',
      });
      const context = { params: { slug: ' ' } };
  
      const response = await DELETE(request, context);
      const responseBody = await response.json();
  
      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid material slug in URL');
      expect(prisma.material.findUnique).not.toHaveBeenCalled();
      expect(actualDeleteFile).not.toHaveBeenCalled();
      expect(mockTx.material.update).not.toHaveBeenCalled();
      expect(mockTx.material.delete).not.toHaveBeenCalled();
    });
  });
});
