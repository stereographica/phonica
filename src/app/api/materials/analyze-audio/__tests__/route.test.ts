import { POST } from '../route';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AudioMetadataService } from '@/lib/audio-metadata';
import { NextRequest } from 'next/server';

// Mock AudioMetadataService
const mockAnalyzeAudio = jest.fn();
jest.mock('@/lib/audio-metadata', () => ({
  AudioMetadataService: jest.fn().mockImplementation(() => ({
    analyzeAudio: mockAnalyzeAudio,
  })),
}));

describe('POST /api/materials/analyze-audio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeAudio.mockClear();
  });

  it('should analyze audio successfully', async () => {
    const mockMetadata = {
      fileFormat: 'WAV',
      sampleRate: 48000,
      bitDepth: 24,
      durationSeconds: 120.5,
      channels: 2,
    };
    mockAnalyzeAudio.mockResolvedValue(mockMetadata);

    const request = new NextRequest('http://localhost:3000/api/materials/analyze-audio', {
      method: 'POST',
      body: JSON.stringify({ tempFileId: 'test-temp-file-id-123' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockMetadata);
    expect(mockAnalyzeAudio).toHaveBeenCalledWith('test-temp-file-id-123');
  });

  it('should return 400 when tempFileId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/materials/analyze-audio', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'tempFileId is required',
    });
    expect(mockAnalyzeAudio).not.toHaveBeenCalled();
  });

  it('should return 404 when file not found', async () => {
    mockAnalyzeAudio.mockRejectedValue(new Error('Temporary file not found'));

    const request = new NextRequest('http://localhost:3000/api/materials/analyze-audio', {
      method: 'POST',
      body: JSON.stringify({ tempFileId: 'non-existent-id' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      error: 'Temporary file not found',
    });
  });

  it('should return 500 when metadata extraction fails', async () => {
    mockAnalyzeAudio.mockRejectedValue(new Error('Failed to extract metadata'));

    const request = new NextRequest('http://localhost:3000/api/materials/analyze-audio', {
      method: 'POST',
      body: JSON.stringify({ tempFileId: 'test-id' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to analyze audio file',
    });
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/materials/analyze-audio', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Invalid request body',
    });
  });

  it('should handle various audio formats', async () => {
    const formats = [
      { fileFormat: 'MP3', bitDepth: null },
      { fileFormat: 'AAC', bitDepth: null },
      { fileFormat: 'FLAC', bitDepth: 24 },
      { fileFormat: 'OGG', bitDepth: null },
    ];

    for (const format of formats) {
      const mockMetadata = {
        fileFormat: format.fileFormat,
        sampleRate: 44100,
        bitDepth: format.bitDepth,
        durationSeconds: 180,
        channels: 2,
      };
      mockAnalyzeAudio.mockResolvedValue(mockMetadata);

      const request = new NextRequest('http://localhost:3000/api/materials/analyze-audio', {
        method: 'POST',
        body: JSON.stringify({ tempFileId: `test-${format.fileFormat}` }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fileFormat).toBe(format.fileFormat);
      expect(data.bitDepth).toBe(format.bitDepth);
    }
  });

  it('should handle timeout errors', async () => {
    mockAnalyzeAudio.mockRejectedValue(new Error('FFProbe timeout'));

    const request = new NextRequest('http://localhost:3000/api/materials/analyze-audio', {
      method: 'POST',
      body: JSON.stringify({ tempFileId: 'timeout-test' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to analyze audio file',
    });
  });
});
