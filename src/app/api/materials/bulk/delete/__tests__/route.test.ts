import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { markFileForDeletion, deleteFile, unmarkFileForDeletion } from '@/lib/file-system';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/file-system', () => ({
  markFileForDeletion: jest.fn(),
  deleteFile: jest.fn(),
  unmarkFileForDeletion: jest.fn(),
}));

describe('POST /api/materials/bulk/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should return 400 if materialIds is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(data.details).toBeDefined();
    });

    it('should return 400 if materialIds is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({ materialIds: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 404 if any material is not found', async () => {
      const mockMaterials = [
        { id: 'mat1', title: 'Material 1', filePath: 'audio1.wav' },
        { id: 'mat2', title: 'Material 2', filePath: 'audio2.wav' },
      ];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);

      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({
          materialIds: ['mat1', 'mat2', 'mat3'], // mat3 doesn't exist
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Materials not found: mat3');
    });
  });

  describe('Successful Deletion', () => {
    it('should delete materials successfully', async () => {
      const mockMaterials = [
        { id: 'mat1', title: 'Material 1', filePath: 'audio1.wav' },
        { id: 'mat2', title: 'Material 2', filePath: 'audio2.wav' },
      ];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (markFileForDeletion as jest.Mock).mockResolvedValue(undefined);
      (deleteFile as jest.Mock).mockResolvedValue(undefined);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          material: {
            update: jest.fn(),
            deleteMany: jest.fn(),
          },
        };
        await fn(tx);
        return { deletedCount: 2 };
      });

      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({
          materialIds: ['mat1', 'mat2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(2);
      expect(data.deletedMaterials).toHaveLength(2);
      expect(data.deletedMaterials).toEqual([
        { id: 'mat1', title: 'Material 1' },
        { id: 'mat2', title: 'Material 2' },
      ]);

      // Verify files were marked and deleted
      expect(markFileForDeletion).toHaveBeenCalledTimes(2);
      expect(deleteFile).toHaveBeenCalledTimes(2);
    });

    it('should handle materials without file paths', async () => {
      const mockMaterials = [
        { id: 'mat1', title: 'Material 1', filePath: 'audio1.wav' },
        { id: 'mat2', title: 'Material 2', filePath: null }, // No file
      ];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (markFileForDeletion as jest.Mock).mockResolvedValue(undefined);
      (deleteFile as jest.Mock).mockResolvedValue(undefined);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          material: {
            update: jest.fn(),
            deleteMany: jest.fn(),
          },
        };
        await fn(tx);
        return { deletedCount: 2 };
      });

      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({
          materialIds: ['mat1', 'mat2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Only one file should be marked/deleted
      expect(markFileForDeletion).toHaveBeenCalledTimes(1);
      expect(deleteFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should rollback file marks on transaction failure', async () => {
      const mockMaterials = [{ id: 'mat1', title: 'Material 1', filePath: 'audio1.wav' }];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (markFileForDeletion as jest.Mock).mockResolvedValue(undefined);
      (unmarkFileForDeletion as jest.Mock).mockResolvedValue(undefined);
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({
          materialIds: ['mat1'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');

      // Verify file was unmarked due to failure
      expect(unmarkFileForDeletion).toHaveBeenCalled();
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('should continue with deletion even if file marking fails', async () => {
      const mockMaterials = [{ id: 'mat1', title: 'Material 1', filePath: 'audio1.wav' }];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (markFileForDeletion as jest.Mock).mockRejectedValue(new Error('File not found'));
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          material: {
            update: jest.fn(),
            deleteMany: jest.fn(),
          },
        };
        await fn(tx);
        return { deletedCount: 1 };
      });

      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({
          materialIds: ['mat1'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(1);
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });

  describe('Related Records Deletion', () => {
    it('should delete related tags and equipment associations', async () => {
      const mockMaterials = [{ id: 'mat1', title: 'Material 1', filePath: 'audio1.wav' }];

      (prisma.material.findMany as jest.Mock).mockResolvedValue(mockMaterials);
      (markFileForDeletion as jest.Mock).mockResolvedValue(undefined);
      (deleteFile as jest.Mock).mockResolvedValue(undefined);

      let txMaterialUpdateCalled = false;
      let txMaterialDeleteCalled = false;

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          material: {
            update: jest.fn(() => {
              txMaterialUpdateCalled = true;
            }),
            deleteMany: jest.fn(() => {
              txMaterialDeleteCalled = true;
            }),
          },
        };
        await fn(tx);
        return { deletedCount: 1 };
      });

      const request = new NextRequest('http://localhost:3000/api/materials/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({
          materialIds: ['mat1'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(txMaterialUpdateCalled).toBe(true);
      expect(txMaterialDeleteCalled).toBe(true);
    });
  });
});
