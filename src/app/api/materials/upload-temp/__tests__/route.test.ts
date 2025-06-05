import { POST } from '../route';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AudioMetadataService } from '@/lib/audio-metadata';
import { NextRequest } from 'next/server';

// Mock AudioMetadataService
const mockSaveTempFile = jest.fn();
jest.mock('@/lib/audio-metadata', () => ({
  AudioMetadataService: jest.fn().mockImplementation(() => ({
    saveTempFile: mockSaveTempFile,
  })),
}));

describe('POST /api/materials/upload-temp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveTempFile.mockClear();
  });

  it('should upload file successfully', async () => {
    const tempFileId = 'test-temp-file-id-123';
    mockSaveTempFile.mockResolvedValue(tempFileId);

    // Create a mock file
    const file = new File(['test audio content'], 'test.wav', { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', file);

    // Create mock request
    const request = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tempFileId,
      fileName: 'test.wav',
      fileSize: 18, // 'test audio content'.length
    });
    expect(mockSaveTempFile).toHaveBeenCalledWith(expect.any(File));
  });

  it('should return 400 when no file is provided', async () => {
    const formData = new FormData();

    const request = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'No file provided',
    });
    expect(mockSaveTempFile).not.toHaveBeenCalled();
  });

  it('should return 400 when file is not an audio file', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    const request = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Invalid file type. Please upload an audio file.',
    });
    expect(mockSaveTempFile).not.toHaveBeenCalled();
  });

  it('should handle upload errors', async () => {
    mockSaveTempFile.mockRejectedValue(new Error('Upload failed'));

    const file = new File(['test audio content'], 'test.wav', { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', file);

    const request = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to upload file',
    });
  });

  it('should handle large files', async () => {
    const tempFileId = 'test-temp-file-id-123';
    mockSaveTempFile.mockResolvedValue(tempFileId);

    // Create a large mock file (10MB)
    const largeContent = new Uint8Array(10 * 1024 * 1024);
    const file = new File([largeContent], 'large-audio.wav', { type: 'audio/wav' });

    // Create a mock file with explicit size property for JSDOM
    Object.defineProperty(file, 'size', {
      value: 10 * 1024 * 1024,
      writable: false,
    });

    const formData = new FormData();
    formData.append('file', file);

    const request = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tempFileId,
      fileName: 'large-audio.wav',
      fileSize: 10 * 1024 * 1024,
    });
  });

  it('should accept various audio file types', async () => {
    const audioTypes = [
      { name: 'test.wav', type: 'audio/wav' },
      { name: 'test.mp3', type: 'audio/mpeg' },
      { name: 'test.m4a', type: 'audio/mp4' },
      { name: 'test.flac', type: 'audio/flac' },
      { name: 'test.ogg', type: 'audio/ogg' },
      { name: 'test.aiff', type: 'audio/aiff' },
    ];

    for (const audioType of audioTypes) {
      mockSaveTempFile.mockResolvedValue('test-id');

      const file = new File(['content'], audioType.name, { type: audioType.type });
      const formData = new FormData();
      formData.append('file', file);

      const request = {
        formData: jest.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    expect(mockSaveTempFile).toHaveBeenCalledTimes(audioTypes.length);
  });
});
