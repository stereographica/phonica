import path from 'path';

// fs/promisesのデフォルトエクスポートをモック
const mockFs = {
  access: jest.fn(),
  readdir: jest.fn(),
  unlink: jest.fn(),
  rename: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
};

jest.mock('fs/promises', () => ({
  __esModule: true,
  default: mockFs,
}));

// 他のモジュールも設定
jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    equipment: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/file-system', () => ({
  deleteFile: jest.fn(),
  markFileForDeletion: jest.fn(),
  unmarkFileForDeletion: jest.fn(),
  checkFileExists: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'test-uuid-v4',
}));

// モック設定後にインポート
import { NextRequest } from 'next/server';
import { DELETE, PUT } from '../route';
import { prisma } from '@/lib/prisma';
import { 
  deleteFile as actualDeleteFile,
  markFileForDeletion,
  unmarkFileForDeletion,
  checkFileExists
} from '@/lib/file-system';

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
      equipment: {
        findMany: jest.fn(),
      },
      materialTag: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      materialEquipment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE', () => {
    it('should delete a material and its associated file using 2-phase deletion', async () => {
      const mockSlug = 'test-material-to-delete';
      const mockFilePath = 'uploads/materials/test-file.wav';
      const absoluteFilePath = path.join(process.cwd(), 'public', mockFilePath);
      const markedPath = `${absoluteFilePath}.deleted_123456`;
      
      // Setup mocks
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-id',
        slug: mockSlug,
        filePath: mockFilePath,
      });
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));
      
      // Mock checkFileExists to return true (file exists)
      (checkFileExists as jest.Mock).mockResolvedValueOnce(true);
      (markFileForDeletion as jest.Mock).mockResolvedValueOnce(markedPath);
      (actualDeleteFile as jest.Mock).mockResolvedValueOnce(undefined);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');

      // Verify database operations
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

      // Verify 2-phase file deletion
      expect(checkFileExists).toHaveBeenCalledWith(absoluteFilePath);
      expect(markFileForDeletion).toHaveBeenCalledWith(absoluteFilePath);
      expect(actualDeleteFile).toHaveBeenCalledWith(markedPath, {
        allowedBaseDir: path.join(process.cwd(), 'public', 'uploads', 'materials'),
        materialId: 'test-id',
        skipValidation: true
      });
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
      expect((markFileForDeletion as jest.Mock)).not.toHaveBeenCalled();
      expect(mockTx.material.update).not.toHaveBeenCalled();
      expect(mockTx.material.delete).not.toHaveBeenCalled();
    });

    it('should handle file deletion errors gracefully (except ENOENT)', async () => {
      const mockSlug = 'material-file-delete-fail';
      const mockFilePath = 'uploads/materials/file-to-fail-delete.wav';
      const absoluteFilePath = path.join(process.cwd(), 'public', mockFilePath);
      const markedPath = `${absoluteFilePath}.deleted_123456`;
      
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-id-fail',
        slug: mockSlug,
        filePath: mockFilePath,
      });
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));
      
      // Mock checkFileExists to return true (file exists)
      (checkFileExists as jest.Mock).mockResolvedValueOnce(true);
      (markFileForDeletion as jest.Mock).mockResolvedValueOnce(markedPath);
      (actualDeleteFile as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');
      
      // DB operations should still succeed
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

      // File operations attempted but failed
      expect(checkFileExists).toHaveBeenCalledWith(absoluteFilePath);
      expect((markFileForDeletion as jest.Mock)).toHaveBeenCalledWith(absoluteFilePath);
      expect(actualDeleteFile).toHaveBeenCalledWith(markedPath, {
        allowedBaseDir: path.join(process.cwd(), 'public', 'uploads', 'materials'),
        materialId: 'test-id-fail',
        skipValidation: true
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to delete marked file ${markedPath}:`),
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle file not found (ENOENT) silently', async () => {
      const mockSlug = 'material-file-not-found';
      const mockFilePath = 'uploads/materials/missing-file.wav';
      const absoluteFilePath = path.join(process.cwd(), 'public', mockFilePath);
      
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-id-missing',
        slug: mockSlug,
        filePath: mockFilePath,
      });
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));
      
      // Mock checkFileExists to return false (file doesn't exist)
      (checkFileExists as jest.Mock).mockResolvedValueOnce(false);
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');
      
      // File should not be marked or deleted if it doesn't exist
      expect(checkFileExists).toHaveBeenCalledWith(absoluteFilePath);
      expect((markFileForDeletion as jest.Mock)).not.toHaveBeenCalled();
      expect(actualDeleteFile).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });

    it('should rollback file marking on DB transaction failure', async () => {
      const mockSlug = 'material-db-fail';
      const mockFilePath = 'uploads/materials/test-file.wav';
      const absoluteFilePath = path.join(process.cwd(), 'public', mockFilePath);
      const markedPath = `${absoluteFilePath}.deleted_123456`;
      
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-id-db-fail',
        slug: mockSlug,
        filePath: mockFilePath,
      });
      
      // Mock checkFileExists to return true (file exists)
      (checkFileExists as jest.Mock).mockResolvedValueOnce(true);
      (markFileForDeletion as jest.Mock).mockResolvedValueOnce(markedPath);
      
      // DB transaction failure
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('DB transaction failed'));
      (unmarkFileForDeletion as jest.Mock).mockResolvedValueOnce(absoluteFilePath);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
      
      // File should be marked and then unmarked due to DB failure
      expect(checkFileExists).toHaveBeenCalledWith(absoluteFilePath);
      expect((markFileForDeletion as jest.Mock)).toHaveBeenCalledWith(absoluteFilePath);
      expect((unmarkFileForDeletion as jest.Mock)).toHaveBeenCalledWith(markedPath);
      expect(actualDeleteFile).not.toHaveBeenCalled();
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
      expect((markFileForDeletion as jest.Mock)).not.toHaveBeenCalled();
      expect(mockTx.material.update).not.toHaveBeenCalled();
      expect(mockTx.material.delete).not.toHaveBeenCalled();
    });

    it('should successfully delete a material without file', async () => {
      const mockSlug = 'test-material-no-file';
      
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-id',
        slug: mockSlug,
        filePath: null, // No file
      });
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: { slug: mockSlug } };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');

      // No file operations should be performed
      expect(checkFileExists).not.toHaveBeenCalled();
      expect((markFileForDeletion as jest.Mock)).not.toHaveBeenCalled();
      expect(actualDeleteFile).not.toHaveBeenCalled();

      // DB operations should succeed
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
    });
  });

  describe('PUT', () => {
    const createMockFormData = (data: Record<string, string | string[]>) => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          formData.append(key, value.join(','));
        } else {
          formData.append(key, value);
        }
      }
      return formData;
    };

    it('should update material with equipment IDs', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material',
        memo: 'Updated memo',
        equipmentIds: ['equip-1', 'equip-2']
      });

      // Mock form data parsing
      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock existing equipment
      mockTx.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer', type: 'Mixer' },
        { id: 'equip-2', name: 'Mic', type: 'Microphone' }
      ]);

      // Mock material update result
      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
        memo: 'Updated memo'
      };

      mockTx.material.update
        .mockResolvedValueOnce(mockMaterial) // First update call
        .mockResolvedValueOnce(mockMaterial); // Equipment update call

      // Mock final result
      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [],
        equipments: [
          { id: 'equip-1', name: 'Mixer', type: 'Mixer' },
          { id: 'equip-2', name: 'Mic', type: 'Microphone' }
        ]
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.title).toBe('Updated Material');
      expect(responseBody.equipments).toHaveLength(2);

      // Verify equipment validation was called
      expect(mockTx.equipment.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['equip-1', 'equip-2'] } }
      });

      // Verify equipment update was called
      expect(mockTx.material.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mat-1' },
          data: expect.objectContaining({
            equipments: {
              set: [],
              connect: [{ id: 'equip-1' }, { id: 'equip-2' }],
            },
          }),
        })
      );
    });

    it('should return 400 for invalid equipment IDs', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material',
        equipmentIds: ['equip-1', 'invalid-equip']
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock only one equipment exists
      mockTx.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer', type: 'Mixer' }
      ]);

      const mockMaterial = { id: 'mat-1', title: 'Updated Material', slug: mockSlug };
      mockTx.material.update.mockResolvedValue(mockMaterial);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        try {
          await callback(mockTx);
        } catch (error) {
          throw error;
        }
      });

      const context = { params: { slug: mockSlug } };
      
      await expect(PUT(mockRequest, context)).rejects.toThrow('Invalid equipment IDs: invalid-equip');
    });

    it('should handle empty equipment IDs array', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material',
        equipmentIds: []
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);
      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [],
        equipments: []
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.equipments).toHaveLength(0);

      // Equipment validation should not be called for empty array
      expect(mockTx.equipment.findMany).not.toHaveBeenCalled();
    });
  });
});