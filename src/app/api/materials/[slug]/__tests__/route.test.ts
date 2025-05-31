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
import { DELETE, PUT, GET } from '../route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
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
        tags: [
          { id: 'tag-1', name: 'nature', slug: 'nature' }
        ],
        equipments: [
          { id: 'equip-1', name: 'Recorder', type: 'Audio', manufacturer: 'Sony' }
        ]
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(mockMaterial);

      const request = new NextRequest(`http://localhost/api/materials/${mockSlug}`, {
        method: 'GET',
      });
      const context = { params: { slug: mockSlug } };

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
      const context = { params: { slug: mockSlug } };

      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
    });

    it('should return 400 for invalid slug', async () => {
      const request = new NextRequest('http://localhost/api/materials/ ', {
        method: 'GET',
      });
      const context = { params: { slug: ' ' } };

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
      const context = { params: { slug: mockSlug } };

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
      const context = { params: { slug: mockSlug } };

      const response = await GET(request, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request parameters');
    });
  });

  describe('PUT', () => {
    const createMockFormData = (data: Record<string, string | string[]>) => {
      const mockEntries = Object.entries(data).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : value
      ]);
      
      return {
        entries: jest.fn().mockReturnValue(mockEntries),
        get: jest.fn((key: string) => {
          const entry = mockEntries.find(([k]) => k === key);
          return entry ? entry[1] : null;
        }),
        has: jest.fn((key: string) => mockEntries.some(([k]) => k === key))
      };
    };

    it('should update material with basic fields', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material',
        memo: 'Updated memo'
      });

      // Mock form data parsing
      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock material update result
      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug,
        memo: 'Updated memo'
      };

      mockTx.material.update.mockResolvedValue(mockMaterial);

      // Mock final result
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
      expect(responseBody.title).toBe('Updated Material');
      expect(responseBody.equipments).toHaveLength(0);
    });

    it('should return 400 for invalid slug in PUT', async () => {
      const mockSlug = ' ';
      const formData = createMockFormData({
        title: 'Updated Material'
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid material slug in URL');
    });

    it('should return 400 for invalid request body', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: '', // Invalid empty title
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request body');
    });

    it('should handle file upload', async () => {
      const mockSlug = 'test-material';
      const mockFile = {
        name: 'test.wav',
        size: 1000,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
      };
      
      // Mock FormData with file
      const formDataWithFile = {
        entries: jest.fn().mockReturnValue([
          ['title', 'Updated Material'],
          ['file', mockFile]
        ]),
        get: jest.fn((key: string) => {
          if (key === 'title') return 'Updated Material';
          if (key === 'file') return mockFile;
          return null;
        }),
        has: jest.fn((key: string) => ['title', 'file'].includes(key))
      };

      const mockRequest = {
        formData: () => Promise.resolve(formDataWithFile),
      } as unknown as NextRequest;

      // Mock file system operations
      (mockFs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (mockFs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      // Mock file-system module functions
      (checkFileExists as jest.Mock).mockResolvedValue(true);
      (markFileForDeletion as jest.Mock).mockResolvedValue('/path/to/marked/file.deleted_123');

      // Mock existing material for file replacement
      (prisma.material.findUnique as jest.Mock).mockResolvedValue({
        filePath: '/old/path.wav'
      });

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

      expect(response.status).toBe(200);
    });

    it('should handle transaction failure and cleanup', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material'
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock transaction failure
      (prisma.$transaction as jest.Mock).mockImplementation(async () => {
        return null; // Simulate transaction returning null
      });

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found or update failed');
    });

    it('should handle general errors in PUT', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material'
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock general error
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('General error'));

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Internal Server Error');
    });

    it('should handle zod validation errors in PUT', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material'
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock zod error
      (prisma.$transaction as jest.Mock).mockImplementation(() => {
        throw new z.ZodError([]);
      });

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Invalid request data');
    });

    it('should handle material not found error in PUT', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material'
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock specific error message
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Material not found for update'));

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);
      const responseBody = await response.json();

      expect(response.status).toBe(404);
      expect(responseBody.error).toBe('Material not found');
    });

    it('should handle equipment IDs and tags update', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material',
        tags: ['tag1', 'tag2'],
        equipmentIds: ['equip-1', 'equip-2']
      });

      const mockRequest = {
        formData: () => Promise.resolve(formData),
      } as unknown as NextRequest;

      // Mock existing equipment
      mockTx.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer', type: 'Mixer' },
        { id: 'equip-2', name: 'Mic', type: 'Microphone' }
      ]);

      const mockMaterial = {
        id: 'mat-1',
        title: 'Updated Material',
        slug: mockSlug
      };

      mockTx.material.update
        .mockResolvedValueOnce(mockMaterial) // First update
        .mockResolvedValueOnce(mockMaterial) // Tags update
        .mockResolvedValueOnce(mockMaterial); // Equipment update

      mockTx.material.findUnique.mockResolvedValue({
        ...mockMaterial,
        tags: [{ id: 'tag-1', name: 'tag1', slug: 'tag1' }],
        equipments: [{ id: 'equip-1', name: 'Mixer', type: 'Mixer' }]
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(mockTx));

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);

      expect(response.status).toBe(200);
    });

    it('should handle various field types', async () => {
      const mockSlug = 'test-material';
      const formData = {
        entries: jest.fn().mockReturnValue([
          ['title', 'Updated Material'],
          ['sampleRate', '48000'],
          ['bitDepth', '24'],
          ['latitude', '35.6762'],
          ['longitude', '139.6503'],
          ['rating', '5'],
          ['memo', 'Updated memo'],
          ['fileFormat', 'WAV'],
          ['locationName', 'Tokyo'],
          ['recordedAt', '2023-01-01T00:00:00Z']
        ]),
        get: jest.fn((key: string) => {
          const entries = [
            ['title', 'Updated Material'],
            ['sampleRate', '48000'],
            ['bitDepth', '24'],
            ['latitude', '35.6762'],
            ['longitude', '139.6503'],
            ['rating', '5'],
            ['memo', 'Updated memo'],
            ['fileFormat', 'WAV'],
            ['locationName', 'Tokyo'],
            ['recordedAt', '2023-01-01T00:00:00Z']
          ];
          const entry = entries.find(([k]) => k === key);
          return entry ? entry[1] : null;
        }),
        has: jest.fn((key: string) => key === 'recordedAt')
      };

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

      expect(response.status).toBe(200);
    });

    it('should handle empty string values', async () => {
      const mockSlug = 'test-material';
      const formData = {
        entries: jest.fn().mockReturnValue([
          ['title', 'Updated Material'],
          ['memo', ''],
          ['fileFormat', ''],
          ['locationName', ''],
          ['sampleRate', ''],
          ['bitDepth', ''],
          ['latitude', ''],
          ['longitude', ''],
          ['rating', '']
        ]),
        get: jest.fn((key: string) => {
          if (key === 'title') return 'Updated Material';
          return ''; // Empty string for other fields
        }),
        has: jest.fn(() => false)
      };

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

      expect(response.status).toBe(200);
    });

    it('should handle invalid equipment IDs during transaction', async () => {
      const mockSlug = 'test-material';
      const formData = createMockFormData({
        title: 'Updated Material',
        equipmentIds: ['equip-1', 'invalid-equip']
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
      // Mock only one equipment exists
      mockTx.equipment.findMany.mockResolvedValue([
        { id: 'equip-1', name: 'Mixer', type: 'Mixer' }
      ]);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(mockTx);
      });

      const context = { params: { slug: mockSlug } };
      const response = await PUT(mockRequest, context);

      expect(response.status).toBe(500); // Error should result in 500
    });
  });
});