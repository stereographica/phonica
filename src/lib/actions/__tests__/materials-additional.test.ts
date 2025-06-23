/**
 * @jest-environment node
 */

import {
  getMaterial,
  uploadAndAnalyzeAudio,
  createMaterialWithMetadata,
  updateMaterialWithMetadata,
} from '../materials';
import { prisma } from '@/lib/prisma';
import { AudioMetadataService } from '@/lib/audio-metadata';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    material: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    equipment: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audio-metadata');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// Mock FormData and File
global.FormData = jest.fn().mockImplementation(() => ({
  get: jest.fn(),
})) as unknown as typeof FormData;

global.File = jest
  .fn()
  .mockImplementation((content: BlobPart[], name: string, options?: FilePropertyBag) => ({
    name,
    type: options?.type || '',
    size: Array.isArray(content) && typeof content[0] === 'string' ? content[0].length : 0,
    arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
  })) as unknown as typeof File;

describe('materials actions - additional tests', () => {
  const mockAudioMetadataService = {
    saveTempFile: jest.fn(),
    extractMetadata: jest.fn(),
    analyzeAudio: jest.fn(),
    verifyTempFile: jest.fn(),
    persistTempFile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AudioMetadataService as jest.Mock).mockImplementation(() => mockAudioMetadataService);
  });

  describe('getMaterial', () => {
    it('should fetch material successfully', async () => {
      const mockMaterial = {
        id: 'mat-1',
        slug: 'test-material',
        title: 'Test Material',
        recordedAt: new Date('2024-01-01T10:00:00'),
        memo: 'Test memo',
        filePath: '/uploads/materials/test.wav',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 2,
        latitude: 35.6762,
        longitude: 139.6503,
        locationName: 'Tokyo',
        rating: 5,
        tags: [{ name: 'nature' }, { name: 'forest' }],
        equipments: [
          { id: 'eq-1', name: 'Mic 1' },
          { id: 'eq-2', name: 'Recorder 1' },
        ],
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(mockMaterial);

      const result = await getMaterial('test-material');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'mat-1',
        slug: 'test-material',
        title: 'Test Material',
        recordedDate: mockMaterial.recordedAt.toISOString(),
        memo: 'Test memo',
        tags: [{ name: 'nature' }, { name: 'forest' }],
        equipments: [
          { id: 'eq-1', name: 'Mic 1' },
          { id: 'eq-2', name: 'Recorder 1' },
        ],
        filePath: '/uploads/materials/test.wav',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 2,
        latitude: 35.6762,
        longitude: 139.6503,
        locationName: 'Tokyo',
        rating: 5,
      });

      expect(prisma.material.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-material' },
        include: {
          tags: true,
          equipments: true,
        },
      });
    });

    it('should return error when material not found', async () => {
      (prisma.material.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getMaterial('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Material not found');
    });

    it('should handle database errors', async () => {
      (prisma.material.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getMaterial('test-material');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch material');
    });
  });

  describe('uploadAndAnalyzeAudio', () => {
    it('should upload and analyze audio successfully', async () => {
      const mockFile = new File(['test audio content'], 'test.wav', { type: 'audio/wav' });
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockReturnValue(mockFile);

      const mockMetadata = {
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 2,
      };

      mockAudioMetadataService.saveTempFile.mockResolvedValue('temp-file-id');
      mockAudioMetadataService.extractMetadata.mockResolvedValue(mockMetadata);
      mockAudioMetadataService.analyzeAudio.mockResolvedValue(mockMetadata);

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(true);
      expect(result.tempFileId).toBe('temp-file-id');
      expect(result.fileName).toBe('test.wav');
      expect(result.metadata).toEqual(mockMetadata);

      expect(mockAudioMetadataService.saveTempFile).toHaveBeenCalledWith(mockFile);
      expect(mockAudioMetadataService.analyzeAudio).toHaveBeenCalledWith('temp-file-id');
    });

    it('should return error when no file provided', async () => {
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockReturnValue(null);

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should handle metadata extraction error', async () => {
      const mockFile = new File(['test audio content'], 'test.wav', { type: 'audio/wav' });
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockReturnValue(mockFile);

      mockAudioMetadataService.saveTempFile.mockResolvedValue('temp-file-id');
      mockAudioMetadataService.analyzeAudio.mockRejectedValue(new Error('Extraction failed'));

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to analyze audio file');
    });

    it('should handle upload error', async () => {
      const mockFile = new File(['test audio content'], 'test.wav', { type: 'audio/wav' });
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockReturnValue(mockFile);

      mockAudioMetadataService.saveTempFile.mockRejectedValue(new Error('Upload failed'));

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload file');
    });
  });

  describe('createMaterialWithMetadata', () => {
    const mockData = {
      title: 'Test Material',
      tempFileId: 'temp-file-id',
      fileName: 'test.wav',
      recordedAt: '2024-01-01T10:00:00',
      memo: 'Test memo',
      tags: ['nature', 'forest'],
      equipmentIds: ['eq-1', 'eq-2'],
      latitude: 35.6762,
      longitude: 139.6503,
      locationName: 'Tokyo',
      rating: 5,
      metadata: {
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 2,
      },
    };

    it('should create material with metadata successfully', async () => {
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        '/app/public/uploads/materials/test-uuid_test.wav',
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-1' }, { id: 'eq-2' }]);

      const mockCreatedMaterial = {
        id: 'mat-1',
        slug: 'test-material-1234567890',
        ...mockData,
        recordedAt: new Date(mockData.recordedAt),
        tags: mockData.tags.map((name) => ({ name })),
        equipments: [
          { id: 'eq-1', name: 'Mic 1' },
          { id: 'eq-2', name: 'Recorder 1' },
        ],
      };

      (prisma.material.create as jest.Mock).mockResolvedValue(mockCreatedMaterial);

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedMaterial);

      expect(mockAudioMetadataService.verifyTempFile).toHaveBeenCalledWith('temp-file-id');
      expect(mockAudioMetadataService.persistTempFile).toHaveBeenCalledWith(
        'temp-file-id',
        'test-uuid_test.wav',
      );
    });

    it('should return error when temp file not found', async () => {
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(false);

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Temporary file not found');
    });

    it('should return error when file persist fails', async () => {
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockRejectedValue(new Error('Persist failed'));

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to persist file');
    });

    it('should return error for invalid equipment IDs', async () => {
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        '/app/public/uploads/materials/test-uuid_test.wav',
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([
        { id: 'eq-1' }, // eq-2 is missing
      ]);

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid equipment IDs: eq-2');
    });

    it('should handle database unique constraint error', async () => {
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        '/app/public/uploads/materials/test-uuid_test.wav',
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-1' }, { id: 'eq-2' }]);

      const prismaError = new Error('Unique constraint failed');
      (prismaError as { code?: string }).code = 'P2002';
      (prismaError as { meta?: { target: string[] } }).meta = { target: ['title'] };

      (prisma.material.create as jest.Mock).mockRejectedValue(prismaError);

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('そのタイトルの素材は既に存在しています');
    });

    it('should handle slug conflict error', async () => {
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        '/app/public/uploads/materials/test-uuid_test.wav',
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-1' }, { id: 'eq-2' }]);

      const prismaError = new Error('Unique constraint failed');
      (prismaError as { code?: string }).code = 'P2002';
      (prismaError as { meta?: { target: string[] } }).meta = { target: ['slug'] };

      (prisma.material.create as jest.Mock).mockRejectedValue(prismaError);

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slugの生成に失敗しました。もう一度お試しください。');
    });

    it('should handle generic database error', async () => {
      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        '/app/public/uploads/materials/test-uuid_test.wav',
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-1' }, { id: 'eq-2' }]);

      (prisma.material.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('データベースエラーが発生しました');
    });

    it('should create material without optional fields', async () => {
      const minimalData = {
        title: 'Test Material',
        tempFileId: 'temp-file-id',
        fileName: 'test.wav',
        recordedAt: '2024-01-01T10:00:00',
        metadata: {
          fileFormat: 'WAV',
          sampleRate: 48000,
          bitDepth: null,
          durationSeconds: 120,
          channels: 2,
        },
      };

      mockAudioMetadataService.verifyTempFile.mockResolvedValue(true);
      mockAudioMetadataService.persistTempFile.mockResolvedValue(
        '/app/public/uploads/materials/test-uuid_test.wav',
      );

      const mockCreatedMaterial = {
        id: 'mat-1',
        slug: 'test-material-1234567890',
        ...minimalData,
        recordedAt: new Date(minimalData.recordedAt),
        tags: [],
        equipments: [],
      };

      (prisma.material.create as jest.Mock).mockResolvedValue(mockCreatedMaterial);

      const result = await createMaterialWithMetadata(minimalData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedMaterial);
    });
  });

  describe('updateMaterialWithMetadata', () => {
    const mockUpdateData = {
      slug: 'test-material',
      title: 'Updated Material',
      recordedAt: '2024-01-02T10:00:00',
      memo: 'Updated memo',
      tags: ['urban', 'city'],
      equipmentIds: ['eq-3'],
      latitude: 35.6895,
      longitude: 139.6917,
      locationName: 'Shinjuku',
      rating: 4,
    };

    const mockExistingMaterial = {
      id: 'mat-1',
      slug: 'test-material',
      title: 'Original Material',
      filePath: '/uploads/materials/original.wav',
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      durationSeconds: 120,
      channels: 2,
      tags: [],
      equipments: [],
    };

    beforeEach(() => {
      // Setup default findUnique mock for existing material
      (prisma.material.findUnique as jest.Mock).mockResolvedValue(mockExistingMaterial);
    });

    it('should update material successfully', async () => {
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-3' }]);

      const mockUpdatedMaterial = {
        id: 'mat-1',
        ...mockUpdateData,
        slug: 'test-material',
        recordedAt: new Date(mockUpdateData.recordedAt),
        tags: mockUpdateData.tags.map((name) => ({ name })),
        equipments: [{ id: 'eq-3', name: 'Mic 3' }],
      };

      (prisma.material.update as jest.Mock).mockResolvedValue(mockUpdatedMaterial);

      const result = await updateMaterialWithMetadata(mockUpdateData.slug, mockUpdateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedMaterial);

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { slug: 'test-material' },
        data: expect.objectContaining({
          title: 'Updated Material',
          recordedAt: new Date('2024-01-02T10:00:00'),
          memo: 'Updated memo',
          // fileFormat, sampleRate, bitDepth are from existing material since no new file was uploaded
          fileFormat: 'WAV',
          sampleRate: 48000,
          bitDepth: 24,
          latitude: 35.6895,
          longitude: 139.6917,
          locationName: 'Shinjuku',
          rating: 4,
        }),
        include: { tags: true, equipments: true },
      });
    });

    it('should return error for invalid equipment IDs', async () => {
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([]); // No valid equipment

      const result = await updateMaterialWithMetadata(mockUpdateData.slug, mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid equipment IDs: eq-3');
    });

    it('should handle material not found error', async () => {
      // Override the default mock to return null
      (prisma.material.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await updateMaterialWithMetadata(mockUpdateData.slug, mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Material not found');
    });

    it('should handle title conflict error', async () => {
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-3' }]);

      const prismaError = new Error('Unique constraint failed');
      (prismaError as { code?: string }).code = 'P2002';
      (prismaError as { meta?: { target: string[] } }).meta = { target: ['title'] };

      (prisma.material.update as jest.Mock).mockRejectedValue(prismaError);

      const result = await updateMaterialWithMetadata(mockUpdateData.slug, mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('そのタイトルの素材は既に存在しています');
    });

    it('should handle generic database error', async () => {
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-3' }]);

      (prisma.material.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await updateMaterialWithMetadata(mockUpdateData.slug, mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('データベースエラーが発生しました');
    });

    it('should update material with minimal data', async () => {
      const minimalUpdateData = {
        slug: 'test-material',
        title: 'Updated Material',
        recordedAt: '2024-01-02T10:00:00',
      };

      const mockUpdatedMaterial = {
        id: 'mat-1',
        ...minimalUpdateData,
        recordedAt: new Date(minimalUpdateData.recordedAt),
        tags: [],
        equipments: [],
      };

      (prisma.material.update as jest.Mock).mockResolvedValue(mockUpdatedMaterial);

      const result = await updateMaterialWithMetadata(minimalUpdateData.slug, minimalUpdateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedMaterial);
    });
  });
});
