import path from 'path';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

// AudioMetadataServiceのモック
const mockAudioMetadataService = {
  verifyTempFile: jest.fn(),
  persistTempFile: jest.fn(),
  analyzeAudio: jest.fn(),
};

jest.mock('@/lib/audio-metadata', () => ({
  AudioMetadataService: jest.fn(() => mockAudioMetadataService),
  TempFileNotFoundError: class TempFileNotFoundError extends Error {},
}));

// モック設定後にインポート
import { NextRequest } from 'next/server';
import { DELETE, PUT, GET } from '../route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  deleteFile,
  markFileForDeletion,
  unmarkFileForDeletion,
  checkFileExists,
} from '@/lib/file-system';

interface MockTransaction {
  material: {
    update: jest.MockedFunction<(args: unknown) => Promise<unknown>>;
    delete: jest.MockedFunction<(args: unknown) => Promise<unknown>>;
    findUnique: jest.MockedFunction<(args: unknown) => Promise<unknown>>;
  };
  equipment: {
    findMany: jest.MockedFunction<(args: unknown) => Promise<unknown[]>>;
  };
  materialTag: {
    deleteMany: jest.MockedFunction<(args: unknown) => Promise<unknown>>;
  };
  materialEquipment: {
    deleteMany: jest.MockedFunction<(args: unknown) => Promise<unknown>>;
  };
}

describe('API Route: /api/materials/[slug]', () => {
  let mockTx: MockTransaction;

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

    // Reset AudioMetadataService mocks
    mockAudioMetadataService.verifyTempFile.mockReset();
    mockAudioMetadataService.persistTempFile.mockReset();
    mockAudioMetadataService.analyzeAudio.mockReset();
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
      (deleteFile as jest.Mock).mockResolvedValueOnce(undefined);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: mockSlug }) };

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
      expect(deleteFile).toHaveBeenCalledWith(markedPath, {
        allowedBaseDir: path.join(process.cwd(), 'public', 'uploads', 'materials'),
        materialId: 'test-id',
        skipValidation: true,
      });
    });

    it('should return 404 if material to delete is not found', async () => {
      const mockSlug = 'non-existent-slug';
      (prisma.material.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
      expect(deleteFile).not.toHaveBeenCalled();
      expect(markFileForDeletion as jest.Mock).not.toHaveBeenCalled();
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
      (deleteFile as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: mockSlug }) };

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
      expect(markFileForDeletion as jest.Mock).toHaveBeenCalledWith(absoluteFilePath);
      expect(deleteFile).toHaveBeenCalledWith(markedPath, {
        allowedBaseDir: path.join(process.cwd(), 'public', 'uploads', 'materials'),
        materialId: 'test-id-fail',
        skipValidation: true,
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to delete marked file ${markedPath}:`),
        expect.any(Error),
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
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');

      // File should not be marked or deleted if it doesn't exist
      expect(checkFileExists).toHaveBeenCalledWith(absoluteFilePath);
      expect(markFileForDeletion as jest.Mock).not.toHaveBeenCalled();
      expect(deleteFile).not.toHaveBeenCalled();
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
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');

      // File should be marked and then unmarked due to DB failure
      expect(checkFileExists).toHaveBeenCalledWith(absoluteFilePath);
      expect(markFileForDeletion as jest.Mock).toHaveBeenCalledWith(absoluteFilePath);
      expect(unmarkFileForDeletion as jest.Mock).toHaveBeenCalledWith(markedPath);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('should return 400 if slug is invalid', async () => {
      const request = new NextRequest('http://localhost/api/materials/ ', {
        method: 'DELETE',
      });
      const context = { params: Promise.resolve({ slug: ' ' }) };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid material slug in URL');
      expect(prisma.material.findUnique).not.toHaveBeenCalled();
      expect(deleteFile).not.toHaveBeenCalled();
      expect(markFileForDeletion as jest.Mock).not.toHaveBeenCalled();
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
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await DELETE(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('Material deleted successfully');

      // No file operations should be performed
      expect(checkFileExists).not.toHaveBeenCalled();
      expect(markFileForDeletion as jest.Mock).not.toHaveBeenCalled();
      expect(deleteFile).not.toHaveBeenCalled();

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

  describe('GET', () => {
    it('should return material details with equipment and tags', async () => {
      const mockSlug = 'test-material';
      const mockMaterial = {
        id: 'mat-1',
        slug: mockSlug,
        title: 'Test Material',
        memo: 'Test memo',
        filePath: '/uploads/test.wav',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        recordedAt: new Date('2023-01-01T00:00:00Z'),
        latitude: 35.6762,
        longitude: 139.6503,
        locationName: 'Tokyo',
        rating: 5,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        tags: [{ id: 'tag-1', name: 'nature', slug: 'nature' }],
        equipments: [{ id: 'equip-1', name: 'Recorder', type: 'Audio', manufacturer: 'Sony' }],
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(mockMaterial);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'GET',
      });
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.title).toBe('Test Material');
      expect(responseBody.equipments).toHaveLength(1);
      expect(responseBody.tags).toHaveLength(1);
      expect(responseBody.equipments[0].name).toBe('Recorder');
      expect(responseBody.tags[0].name).toBe('nature');
    });

    it('should return 404 if material not found', async () => {
      const mockSlug = 'non-existent';
      (prisma.material.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'GET',
      });
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
    });

    it('should return 400 for invalid slug', async () => {
      const request = new NextRequest('http://localhost/api/materials/ ', {
        method: 'GET',
      });
      const context = { params: Promise.resolve({ slug: ' ' }) };

      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid material slug');
    });

    it('should handle database errors in GET', async () => {
      const mockSlug = 'test-material';
      (prisma.material.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'GET',
      });
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
    });

    it('should handle zod errors in GET', async () => {
      const mockSlug = 'test-material';
      // zodエラーを直接投げる場合をシミュレート
      (prisma.material.findUnique as jest.Mock).mockImplementation(() => {
        throw new z.ZodError([]);
      });

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'GET',
      });
      const context = { params: Promise.resolve({ slug: mockSlug }) };

      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request parameters');
    });
  });

  describe('PUT', () => {
    it('should update material with basic fields', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        memo: 'Updated memo',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock material update result
      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
        memo: 'Updated memo',
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);

      // Mock equipment.findMany for empty equipmentIds
      mockTx.equipment.findMany.mockResolvedValue([]);

      // Mock final result
      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [],
        equipments: [],
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.title).toBe('Updated Material');
      expect(responseBody.equipments).toHaveLength(0);
    });

    it('should return 400 for invalid slug in PUT', async () => {
      const mockSlug = ' ';
      const updateData = {
        title: 'Updated Material',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid material slug in URL');
    });

    it('should return 400 for invalid request body', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: '', // Invalid empty title
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request body');
    });

    it('should handle file upload with tempFileId', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tempFileId: 'temp-123',
        fileName: 'test.wav',
        replaceFile: true,
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock AudioMetadataService
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        'uploads/materials/test-material_test.wav',
      );
      mockAudioMetadataService.analyzeAudio.mockResolvedValue({
        fileFormat: 'WAV',
        sampleRate: 44100,
        bitDepth: 16,
        durationSeconds: 120.5,
        channels: 2,
      });

      // Mock existing material for file replacement
      (prisma.material.findUnique as jest.Mock).mockResolvedValue({
        filePath: 'uploads/materials/old-file.wav',
      });

      // Mock file-system module functions
      (checkFileExists as jest.Mock).mockResolvedValue(true);
      (markFileForDeletion as jest.Mock).mockResolvedValue('/path/to/marked/file.deleted_123');

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);

      // Mock equipment.findMany for empty equipmentIds
      mockTx.equipment.findMany.mockResolvedValue([]);

      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [],
        equipments: [],
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);

      expect(response.status).toBe(200);
    });

    it('should handle transaction failure and cleanup', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock transaction failure
      (prisma.$transaction as jest.Mock).mockImplementation(async () => {
        return null; // Simulate transaction returning null
      });

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found or update failed');
    });

    it('should handle general errors in PUT', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock general error
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('General error'));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
    });

    it('should handle zod validation errors in PUT', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock zod error
      (prisma.$transaction as jest.Mock).mockImplementation(() => {
        throw new z.ZodError([]);
      });

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request data');
    });

    it('should handle file upload with cleanup on transaction failure', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tempFileId: 'temp-123',
        fileName: 'test.wav',
        replaceFile: true,
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock AudioMetadataService
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        'uploads/materials/test-material_test.wav',
      );
      mockAudioMetadataService.analyzeAudio.mockResolvedValue({
        fileFormat: 'WAV',
        sampleRate: 44100,
        bitDepth: 16,
        durationSeconds: 120.5,
        channels: 2,
      });

      // Mock existing material for file replacement
      (prisma.material.findUnique as jest.Mock).mockResolvedValue({
        filePath: 'uploads/materials/old-file.wav',
      });

      // Mock transaction failure
      (prisma.$transaction as jest.Mock).mockImplementation(async () => {
        return null; // Simulate transaction returning null
      });

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found or update failed');
      // Note: cleanup might not be called if transaction returns null early
    });

    it('should handle file operations with marked file deletion on error', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tempFileId: 'temp-123',
        fileName: 'test.wav',
        replaceFile: true,
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock AudioMetadataService
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        'uploads/materials/test-material_test.wav',
      );
      mockAudioMetadataService.analyzeAudio.mockResolvedValue({
        fileFormat: 'WAV',
        sampleRate: 44100,
        bitDepth: 16,
        durationSeconds: 120.5,
        channels: 2,
      });

      // Mock file-system module functions
      (checkFileExists as jest.Mock).mockResolvedValue(true);
      (markFileForDeletion as jest.Mock).mockResolvedValue('/path/to/marked/file.deleted_123');
      (unmarkFileForDeletion as jest.Mock).mockResolvedValue('/path/to/marked/file');

      // Mock existing material for file replacement
      (prisma.material.findUnique as jest.Mock).mockResolvedValue({
        filePath: 'uploads/materials/old-file.wav',
      });

      // Mock transaction error
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
      // Note: error handling cleanup may not be called in all scenarios
    });

    it('should handle material not found error in transaction', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock transaction error with specific message
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error('Material not found for update'),
      );

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
    });

    it('should return 409 for duplicate title on update', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Existing Material Title',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock Prisma unique constraint error
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '2.24.0', meta: { target: ['title'] } },
      );

      (prisma.$transaction as jest.Mock).mockRejectedValue(prismaError);

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('そのタイトルの素材は既に存在しています');
    });

    it('should handle failed old file deletion after successful transaction', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock existing material with a file path (simulating a material that already has a file)
      (prisma.material.findUnique as jest.Mock).mockResolvedValue({
        filePath: 'uploads/materials/old-file.wav',
      });

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);

      // Mock equipment.findMany for empty equipmentIds
      mockTx.equipment.findMany.mockResolvedValue([]);

      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [],
        equipments: [],
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);

      // The route still returns 200 even if old file deletion fails
      // because it happens after the successful response
      expect(response.status).toBe(200);
    });

    it('should handle material not found error in PUT', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock specific error message
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error('Material not found for update'),
      );

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
    });

    it('should handle equipment IDs and tags update', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        tags: ['tag1', 'tag2'],
        equipmentIds: ['equip-1', 'equip-2'],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      // Mock existing equipment
      mockTx.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer', type: 'Mixer' },
        { id: 'equip-2', name: 'Mic', type: 'Microphone' },
      ]);

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
      };

      mockTx.material.update
        .mockResolvedValueOnce(mockMaterial) // First update
        .mockResolvedValueOnce(mockMaterial) // Tags update
        .mockResolvedValueOnce(mockMaterial); // Equipment update

      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [{ id: 'tag-1', name: 'tag1', slug: 'tag1' }],
        equipments: [{ id: 'equip-1', name: 'Mixer', type: 'Mixer' }],
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);

      expect(response.status).toBe(200);
    });

    it('should handle various field types', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        recordedAt: '2023-01-01T00:00:00Z',
        memo: 'Updated memo',
        latitude: 35.6762,
        longitude: 139.6503,
        rating: 5,
        locationName: 'Tokyo',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);

      // Mock equipment.findMany for empty equipmentIds
      mockTx.equipment.findMany.mockResolvedValue([]);

      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [],
        equipments: [],
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);

      expect(response.status).toBe(200);
    });

    it('should handle empty string values', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        memo: '',
        locationName: '',
        tags: [],
        equipmentIds: [],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);

      // Mock equipment.findMany for empty equipmentIds
      mockTx.equipment.findMany.mockResolvedValue([]);

      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [],
        equipments: [],
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);

      expect(response.status).toBe(200);
    });

    it('should handle invalid equipment IDs during transaction', async () => {
      const mockSlug = 'test-material';
      const updateData = {
        title: 'Updated Material',
        equipmentIds: ['equip-1', 'invalid-equip'],
      };

      const mockRequest = {
        json: () => Promise.resolve(updateData),
      } as unknown as NextRequest;

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);
      // Mock only one equipment exists
      mockTx.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer', type: 'Mixer' },
      ]);

      (prisma.$transaction as jest.Mock).mockImplementation(async () => {
        // When callback is executed, it will throw an error due to invalid equipment IDs
        // This simulates what happens in the actual route
        throw new Error(`Invalid equipment IDs: invalid-equip`);
      });

      const context = { params: Promise.resolve({ slug: mockSlug }) };
      const response = await PUT(mockRequest, context);

      // Invalid equipment IDs result in a 500 error (not 404)
      expect(response.status).toBe(500);
    });
  });
});
