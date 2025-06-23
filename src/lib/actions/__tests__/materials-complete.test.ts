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

// Prismaのモック
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

// AudioMetadataServiceのモック
jest.mock('@/lib/audio-metadata');
const MockedAudioMetadataService = AudioMetadataService as jest.MockedClass<
  typeof AudioMetadataService
>;

// グローバルオブジェクトのモック
global.FormData = jest.fn(() => ({
  get: jest.fn(),
})) as unknown as typeof FormData;

global.File = jest.fn((content: BlobPart[], name: string, options?: FilePropertyBag) => ({
  name,
  type: options?.type || '',
  size: Array.isArray(content) && typeof content[0] === 'string' ? content[0].length : 0,
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(8))),
})) as unknown as typeof File;

describe('materials server actions - complete coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getMaterial', () => {
    it('should fetch and format material successfully', async () => {
      const mockMaterial = {
        id: 'mat-1',
        slug: 'test-material',
        title: 'Test Material',
        recordedAt: new Date('2024-01-01T10:00:00Z'),
        memo: 'Test memo',
        filePath: '/uploads/test.wav',
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 120,
        channels: 2,
        latitude: 35.6762,
        longitude: 139.6503,
        locationName: 'Tokyo',
        rating: 5,
        tags: [
          { id: 'tag-1', name: 'nature', slug: 'nature' },
          { id: 'tag-2', name: 'ambient', slug: 'ambient' },
        ],
        equipments: [
          { id: 'eq-1', name: 'Zoom H6', type: 'Recorder' },
          { id: 'eq-2', name: 'AT4040', type: 'Microphone' },
        ],
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(mockMaterial);

      const result = await getMaterial('test-material');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'mat-1',
        slug: 'test-material',
        title: 'Test Material',
        recordedDate: '2024-01-01T10:00:00.000Z',
        memo: 'Test memo',
        tags: [{ name: 'nature' }, { name: 'ambient' }],
        equipments: [
          { id: 'eq-1', name: 'Zoom H6' },
          { id: 'eq-2', name: 'AT4040' },
        ],
        filePath: '/uploads/test.wav',
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
      (prisma.material.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection error'),
      );

      const result = await getMaterial('test-material');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch material');
      expect(console.error).toHaveBeenCalledWith('Error fetching material:', expect.any(Error));
    });
  });

  describe('uploadAndAnalyzeAudio', () => {
    it('should upload and analyze audio file successfully', async () => {
      const mockFile = new File(['audio content'], 'test.wav', { type: 'audio/wav' });
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockReturnValue(mockFile);

      const mockMetadata = {
        fileFormat: 'WAV',
        sampleRate: 48000,
        bitDepth: 24,
        durationSeconds: 60,
        channels: 2,
      };

      const mockAudioService = {
        saveTempFile: jest.fn().mockResolvedValue('temp-123'),
        extractMetadata: jest.fn().mockResolvedValue(mockMetadata),
        verifyTempFile: jest.fn(),
        persistTempFile: jest.fn(),
        cleanupTempFiles: jest.fn(),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(true);
      expect(result.tempFileId).toBe('temp-123');
      expect(result.fileName).toBe('test.wav');
      expect(result.metadata).toEqual(mockMetadata);

      expect(mockAudioService.saveTempFile).toHaveBeenCalledWith(mockFile);
      expect(mockAudioService.extractMetadata).toHaveBeenCalledWith('temp-123');
    });

    it('should return error when no file provided', async () => {
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockReturnValue(null);

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should handle metadata extraction failure', async () => {
      const mockFile = new File(['audio content'], 'test.wav', { type: 'audio/wav' });
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockReturnValue(mockFile);

      const mockAudioService = {
        saveTempFile: jest.fn().mockResolvedValue('temp-123'),
        extractMetadata: jest.fn().mockRejectedValue(new Error('Invalid audio format')),
        verifyTempFile: jest.fn(),
        persistTempFile: jest.fn(),
        cleanupTempFiles: jest.fn(),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to analyze audio file');
    });

    it('should handle upload errors', async () => {
      const mockFormData = new FormData();
      (mockFormData.get as jest.Mock).mockImplementation(() => {
        throw new Error('Form parsing error');
      });

      const result = await uploadAndAnalyzeAudio(mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upload file');
    });
  });

  describe('createMaterialWithMetadata', () => {
    const mockData = {
      title: 'New Material',
      tempFileId: 'temp-123',
      fileName: 'recording.wav',
      recordedAt: '2024-01-01T10:00:00Z',
      memo: 'Test recording',
      tags: ['nature', 'ambient'],
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
      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(true),
        persistTempFile: jest.fn().mockResolvedValue('/uploads/materials/uuid_recording.wav'),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([
        { id: 'eq-1', name: 'Zoom H6' },
        { id: 'eq-2', name: 'AT4040' },
      ]);

      const mockCreatedMaterial = {
        id: 'mat-new',
        title: 'New Material',
        slug: 'new-material',
        filePath: '/uploads/materials/uuid_recording.wav',
        tags: [{ id: 'tag-1', name: 'nature' }],
        equipments: [{ id: 'eq-1', name: 'Zoom H6' }],
      };

      (prisma.material.create as jest.Mock).mockResolvedValue(mockCreatedMaterial);

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedMaterial);

      expect(mockAudioService.verifyTempFile).toHaveBeenCalledWith('temp-123');
      expect(mockAudioService.persistTempFile).toHaveBeenCalledWith(
        'temp-123',
        expect.stringContaining('recording.wav'),
      );
    });

    it('should return error when temporary file not found', async () => {
      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(false),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Temporary file not found');
    });

    it('should handle file persistence failure', async () => {
      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(true),
        persistTempFile: jest.fn().mockRejectedValue(new Error('Disk full')),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to persist file');
    });

    it('should handle invalid equipment IDs', async () => {
      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(true),
        persistTempFile: jest.fn().mockResolvedValue('/uploads/materials/uuid_recording.wav'),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([{ id: 'eq-1', name: 'Zoom H6' }]);

      const result = await createMaterialWithMetadata(mockData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid equipment IDs: eq-2');
    });

    it('should handle duplicate title error', async () => {
      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(true),
        persistTempFile: jest.fn().mockResolvedValue('/uploads/materials/uuid_recording.wav'),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([]);

      const prismaError = {
        code: 'P2002',
        meta: { target: ['title'] },
      };
      (prisma.material.create as jest.Mock).mockRejectedValue(prismaError);

      const result = await createMaterialWithMetadata({
        ...mockData,
        equipmentIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('そのタイトルの素材は既に存在しています');
    });

    it('should handle slug generation failure', async () => {
      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(true),
        persistTempFile: jest.fn().mockResolvedValue('/uploads/materials/uuid_recording.wav'),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([]);

      const prismaError = {
        code: 'P2002',
        meta: { target: ['slug'] },
      };
      (prisma.material.create as jest.Mock).mockRejectedValue(prismaError);

      const result = await createMaterialWithMetadata({
        ...mockData,
        equipmentIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slugの生成に失敗しました。もう一度お試しください。');
    });

    it('should handle general database errors', async () => {
      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(true),
        persistTempFile: jest.fn().mockResolvedValue('/uploads/materials/uuid_recording.wav'),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.material.create as jest.Mock).mockRejectedValue(
        new Error('Database connection lost'),
      );

      const result = await createMaterialWithMetadata({
        ...mockData,
        equipmentIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('データベースエラーが発生しました');
    });
  });

  describe('updateMaterialWithMetadata', () => {
    const mockUpdateData = {
      title: 'Updated Material',
      recordedAt: '2024-01-02T12:00:00Z',
      memo: 'Updated memo',
      tags: ['updated-tag'],
      equipmentIds: ['eq-3'],
      latitude: 35.6895,
      longitude: 139.6917,
      locationName: 'Shinjuku',
      rating: 4,
    };

    it('should update material successfully without new file', async () => {
      const existingMaterial = {
        id: 'mat-1',
        slug: 'existing-material',
        filePath: '/uploads/existing.wav',
        fileFormat: 'WAV',
        sampleRate: 44100,
        bitDepth: 16,
        durationSeconds: 60,
        channels: 2,
        tags: [],
        equipments: [],
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(existingMaterial);
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([
        { id: 'eq-3', name: 'New Equipment' },
      ]);

      const updatedMaterial = {
        ...existingMaterial,
        ...mockUpdateData,
        tags: [{ id: 'tag-new', name: 'updated-tag' }],
        equipments: [{ id: 'eq-3', name: 'New Equipment' }],
      };

      (prisma.material.update as jest.Mock).mockResolvedValue(updatedMaterial);

      const result = await updateMaterialWithMetadata('existing-material', mockUpdateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedMaterial);
    });

    it('should update material with new file upload', async () => {
      const existingMaterial = {
        id: 'mat-1',
        slug: 'existing-material',
        filePath: '/uploads/old.wav',
        tags: [],
        equipments: [],
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(existingMaterial);

      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(true),
        persistTempFile: jest.fn().mockResolvedValue('/uploads/materials/new_file.wav'),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.material.update as jest.Mock).mockResolvedValue({
        ...existingMaterial,
        filePath: '/uploads/materials/new_file.wav',
      });

      const updateDataWithFile = {
        ...mockUpdateData,
        tempFileId: 'temp-456',
        fileName: 'new-recording.wav',
        metadata: {
          fileFormat: 'WAV',
          sampleRate: 96000,
          bitDepth: 32,
          durationSeconds: 180,
          channels: 4,
        },
        equipmentIds: [],
      };

      const result = await updateMaterialWithMetadata('existing-material', updateDataWithFile);

      expect(result.success).toBe(true);
      expect(mockAudioService.verifyTempFile).toHaveBeenCalledWith('temp-456');
      expect(mockAudioService.persistTempFile).toHaveBeenCalled();
    });

    it('should return error when material not found', async () => {
      (prisma.material.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await updateMaterialWithMetadata('non-existent', mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Material not found');
    });

    it('should handle duplicate title error on update', async () => {
      const existingMaterial = {
        id: 'mat-1',
        slug: 'existing-material',
        filePath: '/uploads/existing.wav',
        tags: [],
        equipments: [],
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(existingMaterial);
      (prisma.equipment.findMany as jest.Mock).mockResolvedValue([]);

      const prismaError = {
        code: 'P2002',
        meta: { target: ['title'] },
      };
      (prisma.material.update as jest.Mock).mockRejectedValue(prismaError);

      const result = await updateMaterialWithMetadata('existing-material', {
        ...mockUpdateData,
        equipmentIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('そのタイトルの素材は既に存在しています');
    });

    it('should handle file upload errors during update', async () => {
      const existingMaterial = {
        id: 'mat-1',
        slug: 'existing-material',
        filePath: '/uploads/existing.wav',
        tags: [],
        equipments: [],
      };

      (prisma.material.findUnique as jest.Mock).mockResolvedValue(existingMaterial);

      const mockAudioService = {
        verifyTempFile: jest.fn().mockResolvedValue(false),
      };

      MockedAudioMetadataService.mockImplementation(
        () => mockAudioService as unknown as AudioMetadataService,
      );

      const updateDataWithFile = {
        ...mockUpdateData,
        tempFileId: 'temp-invalid',
        fileName: 'new-recording.wav',
        metadata: {
          fileFormat: 'WAV',
          sampleRate: 48000,
          bitDepth: 24,
          durationSeconds: 60,
          channels: 2,
        },
      };

      const result = await updateMaterialWithMetadata('existing-material', updateDataWithFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Temporary file not found');
    });
  });
});
