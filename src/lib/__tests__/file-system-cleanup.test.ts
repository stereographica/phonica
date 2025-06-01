/**
 * @jest-environment node
 */

import { cleanupOrphanedFiles } from '../file-system';

// Mock fs/promises
const mockReaddir = jest.fn();
const mockUnlink = jest.fn();
const mockAccess = jest.fn();
const mockRename = jest.fn();

jest.mock('fs/promises', () => ({
  default: {
    readdir: mockReaddir,
    unlink: mockUnlink,
    access: mockAccess,
    rename: mockRename,
  },
  readdir: mockReaddir,
  unlink: mockUnlink,
  access: mockAccess,
  rename: mockRename,
}));

const mockFs = {
  readdir: mockReaddir,
  unlink: mockUnlink,
  access: mockAccess,
  rename: mockRename,
};

describe.skip('cleanupOrphanedFiles', () => {
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('deletes old orphaned files', async () => {
    const now = Date.now();
    const oldTimestamp = now - (25 * 60 * 60 * 1000); // 25 hours ago
    const recentTimestamp = now - (1 * 60 * 60 * 1000); // 1 hour ago

    mockFs.readdir.mockResolvedValue([
      'file1.wav',
      `file2.wav.deleted_${oldTimestamp}`,
      `file3.wav.deleted_${recentTimestamp}`,
      'file4.mp3.deleted_invalid',
    ] as unknown as string[]);
    mockFs.unlink.mockResolvedValue(undefined);

    const result = await cleanupOrphanedFiles('/uploads');

    expect(mockFs.readdir).toHaveBeenCalledWith('/uploads');
    expect(mockFs.unlink).toHaveBeenCalledWith(`/uploads/file2.wav.deleted_${oldTimestamp}`);
    expect(mockFs.unlink).toHaveBeenCalledTimes(1);
    expect(result).toEqual([`/uploads/file2.wav.deleted_${oldTimestamp}`]);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Cleaned up orphaned file:')
    );
  });

  it('respects custom maxAge', async () => {
    const now = Date.now();
    const oldTimestamp = now - (2 * 60 * 60 * 1000); // 2 hours ago

    mockFs.readdir.mockResolvedValue([
      `file1.wav.deleted_${oldTimestamp}`,
    ] as unknown as string[]);
    mockFs.unlink.mockResolvedValue(undefined);

    const result = await cleanupOrphanedFiles('/uploads', {
      maxAge: 1 * 60 * 60 * 1000, // 1 hour
    });

    expect(mockFs.unlink).toHaveBeenCalledWith(`/uploads/file1.wav.deleted_${oldTimestamp}`);
    expect(result).toEqual([`/uploads/file1.wav.deleted_${oldTimestamp}`]);
  });

  it('performs dry run without deleting', async () => {
    const now = Date.now();
    const oldTimestamp = now - (25 * 60 * 60 * 1000);

    mockFs.readdir.mockResolvedValue([
      `file1.wav.deleted_${oldTimestamp}`,
    ] as unknown as string[]);

    const result = await cleanupOrphanedFiles('/uploads', {
      dryRun: true,
    });

    expect(mockFs.unlink).not.toHaveBeenCalled();
    expect(result).toEqual([]);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('[DRY RUN] Would delete:')
    );
  });

  it('handles file deletion errors gracefully', async () => {
    const now = Date.now();
    const oldTimestamp = now - (25 * 60 * 60 * 1000);

    mockFs.readdir.mockResolvedValue([
      `file1.wav.deleted_${oldTimestamp}`,
    ] as unknown as string[]);
    mockFs.unlink.mockRejectedValue(new Error('Permission denied'));

    const result = await cleanupOrphanedFiles('/uploads');

    expect(mockFs.unlink).toHaveBeenCalled();
    expect(result).toEqual([]);
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup'),
      expect.objectContaining({ message: expect.any(String) })
    );
  });

  it('handles readdir errors gracefully', async () => {
    mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

    const result = await cleanupOrphanedFiles('/uploads');

    expect(result).toEqual([]);
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error during orphaned files cleanup:',
      expect.objectContaining({ message: expect.any(String) })
    );
  });

  it('ignores files without valid timestamp', async () => {
    mockFs.readdir.mockResolvedValue([
      'file1.wav.deleted_invalid',
      'file2.wav.deleted_',
      'file3.wav',
    ] as unknown as string[]);

    const result = await cleanupOrphanedFiles('/uploads');

    expect(mockFs.unlink).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('does not delete recent files', async () => {
    const now = Date.now();
    const recentTimestamp = now - (1 * 60 * 60 * 1000); // 1 hour ago

    mockFs.readdir.mockResolvedValue([
      `file1.wav.deleted_${recentTimestamp}`,
    ] as unknown as string[]);

    const result = await cleanupOrphanedFiles('/uploads');

    expect(mockFs.unlink).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('processes multiple eligible files', async () => {
    const now = Date.now();
    const oldTimestamp1 = now - (48 * 60 * 60 * 1000); // 48 hours ago
    const oldTimestamp2 = now - (72 * 60 * 60 * 1000); // 72 hours ago

    mockFs.readdir.mockResolvedValue([
      `file1.wav.deleted_${oldTimestamp1}`,
      `file2.mp3.deleted_${oldTimestamp2}`,
    ] as unknown as string[]);
    mockFs.unlink.mockResolvedValue(undefined);

    const result = await cleanupOrphanedFiles('/uploads');

    expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    expect(mockFs.unlink).toHaveBeenCalledWith(`/uploads/file1.wav.deleted_${oldTimestamp1}`);
    expect(mockFs.unlink).toHaveBeenCalledWith(`/uploads/file2.mp3.deleted_${oldTimestamp2}`);
    expect(result).toHaveLength(2);
  });

  it('handles empty directory', async () => {
    mockFs.readdir.mockResolvedValue([] as unknown as string[]);

    const result = await cleanupOrphanedFiles('/uploads');

    expect(mockFs.unlink).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('handles mixed success and failure in deletions', async () => {
    const now = Date.now();
    const oldTimestamp1 = now - (25 * 60 * 60 * 1000);
    const oldTimestamp2 = now - (30 * 60 * 60 * 1000);

    mockFs.readdir.mockResolvedValue([
      `file1.wav.deleted_${oldTimestamp1}`,
      `file2.wav.deleted_${oldTimestamp2}`,
    ] as unknown as string[]);
    
    // First deletion succeeds, second fails
    mockFs.unlink
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Permission denied'));

    const result = await cleanupOrphanedFiles('/uploads');

    expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    expect(result).toEqual([`/uploads/file1.wav.deleted_${oldTimestamp1}`]);
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup'),
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});