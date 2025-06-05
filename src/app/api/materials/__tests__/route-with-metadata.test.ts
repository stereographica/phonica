import { POST } from '../route';
import { prismaMock } from '../../../../../jest.setup';
import { AudioMetadataService } from '@/lib/audio-metadata';
import { NextRequest } from 'next/server';

// Helper function to create a mock NextRequest
function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: URLSearchParams,
): NextRequest {
  const url = new URL(
    `http://localhost/api/materials${searchParams ? '?' + searchParams.toString() : ''}`,
  );
  let requestBody: BodyInit | null | undefined = undefined;
  const headers = new Headers();

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestBody = JSON.stringify(body);
    headers.set('Content-Type', 'application/json');
  }

  const req = new NextRequest(url.toString(), {
    method,
    headers,
    body: requestBody,
  });

  return req;
}

// Mock AudioMetadataService
jest.mock('@/lib/audio-metadata');
const mockAudioMetadataService = AudioMetadataService as jest.MockedClass<
  typeof AudioMetadataService
>;

describe('POST /api/materials with automatic metadata extraction', () => {
  const mockMetadata = {
    fileFormat: 'WAV',
    sampleRate: 48000,
    bitDepth: 24,
    durationSeconds: 120.5,
    channels: 2,
  };

  const validMaterialData = {
    title: 'New Sound',
    tempFileId: 'test-temp-file-id',
    fileName: 'test-audio.wav',
    recordedAt: new Date().toISOString(),
    memo: 'A very new sound',
    tags: ['new', 'test'],
    equipmentIds: ['equip-1', 'equip-2'],
    latitude: null,
    longitude: null,
    locationName: null,
    rating: 5,
    // メタデータも含める（フロントエンドから送信される）
    metadata: mockMetadata,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // AudioMetadataServiceのモック
    const mockServiceInstance = {
      verifyTempFile: jest.fn().mockResolvedValue(true),
      persistTempFile: jest.fn().mockResolvedValue('/uploads/materials/test-uuid.wav'),
    };
    mockAudioMetadataService.mockImplementation(
      () => mockServiceInstance as unknown as AudioMetadataService,
    );
  });

  it('should create material with automatic metadata extraction', async () => {
    // 機材の存在確認をモック
    prismaMock.equipment.findMany.mockResolvedValue([
      {
        id: 'equip-1',
        name: 'Mixer Pro',
        type: 'Mixer',
        manufacturer: 'ProAudio',
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'equip-2',
        name: 'Headphones Deluxe',
        type: 'Headphones',
        manufacturer: 'AudioTech',
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const createdMaterialResponse = {
      id: 'mat-created',
      slug: 'new-sound-123456',
      title: validMaterialData.title,
      filePath: '/uploads/materials/test-uuid.wav',
      recordedAt: new Date(validMaterialData.recordedAt),
      memo: validMaterialData.memo,
      fileFormat: mockMetadata.fileFormat,
      sampleRate: mockMetadata.sampleRate,
      bitDepth: mockMetadata.bitDepth,
      durationSeconds: mockMetadata.durationSeconds,
      channels: mockMetadata.channels,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [
        {
          id: 'tag-new',
          name: 'new',
          slug: 'new',
          createdAt: new Date(),
          updatedAt: new Date(),
          materials: [],
        },
        {
          id: 'tag-test',
          name: 'test',
          slug: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
          materials: [],
        },
      ],
      equipments: [
        {
          id: 'equip-1',
          name: 'Mixer Pro',
          type: 'Mixer',
          manufacturer: 'ProAudio',
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'equip-2',
          name: 'Headphones Deluxe',
          type: 'Headphones',
          manufacturer: 'AudioTech',
          memo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      latitude: null,
      longitude: null,
      locationName: null,
      rating: validMaterialData.rating,
      projects: [],
    };
    prismaMock.material.create.mockResolvedValue(createdMaterialResponse);

    const request = createMockRequest('POST', validMaterialData);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.title).toBe(validMaterialData.title);
    expect(responseBody.fileFormat).toBe(mockMetadata.fileFormat);
    expect(responseBody.sampleRate).toBe(mockMetadata.sampleRate);
    expect(responseBody.bitDepth).toBe(mockMetadata.bitDepth);
    expect(responseBody.durationSeconds).toBe(mockMetadata.durationSeconds);
    expect(responseBody.channels).toBe(mockMetadata.channels);

    // AudioMetadataServiceが呼ばれたことを確認
    const serviceInstance = mockAudioMetadataService.mock.results[0].value;
    expect(serviceInstance.verifyTempFile).toHaveBeenCalledWith(validMaterialData.tempFileId);
    expect(serviceInstance.persistTempFile).toHaveBeenCalledWith(
      validMaterialData.tempFileId,
      expect.stringMatching(/^test-uuid_test-audio\.wav$/),
    );

    // Prismaが正しいデータで呼ばれたことを確認
    expect(prismaMock.material.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: validMaterialData.title,
        filePath: '/uploads/materials/test-uuid.wav',
        memo: validMaterialData.memo,
        recordedAt: expect.any(Date),
        fileFormat: mockMetadata.fileFormat,
        sampleRate: mockMetadata.sampleRate,
        bitDepth: mockMetadata.bitDepth,
        durationSeconds: mockMetadata.durationSeconds,
        channels: mockMetadata.channels,
        rating: validMaterialData.rating,
      }),
      include: { tags: true, equipments: true },
    });
  });

  it('should return 404 if temp file not found', async () => {
    const serviceInstance = {
      verifyTempFile: jest.fn().mockResolvedValue(false),
      persistTempFile: jest.fn(),
    };
    mockAudioMetadataService.mockImplementation(
      () => serviceInstance as unknown as AudioMetadataService,
    );

    const request = createMockRequest('POST', validMaterialData);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.error).toBe('Temporary file not found');
    expect(serviceInstance.persistTempFile).not.toHaveBeenCalled();
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });

  it('should return 400 if metadata is missing', async () => {
    const invalidData = {
      ...validMaterialData,
      metadata: undefined,
    };
    delete invalidData.metadata;

    const request = createMockRequest('POST', invalidData);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Invalid request data');
    expect(responseBody.details).toBeDefined();
  });

  it('should return 400 if tempFileId is missing', async () => {
    const invalidData = {
      ...validMaterialData,
      tempFileId: undefined,
    };
    delete invalidData.tempFileId;

    const request = createMockRequest('POST', invalidData);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Invalid request data');
    expect(responseBody.details).toBeDefined();
  });

  it('should handle file persistence errors', async () => {
    const serviceInstance = {
      verifyTempFile: jest.fn().mockResolvedValue(true),
      persistTempFile: jest.fn().mockRejectedValue(new Error('Failed to persist file')),
    };
    mockAudioMetadataService.mockImplementation(
      () => serviceInstance as unknown as AudioMetadataService,
    );

    const request = createMockRequest('POST', validMaterialData);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toContain('Failed to persist file');
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });
});
