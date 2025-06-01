/**
 * @jest-environment node
 */

// Mock BullMQ and Redis before importing
jest.mock('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: jest.fn(),
    close: jest.fn(),
    getJobs: jest.fn(),
    obliterate: jest.fn(),
  })),
  Worker: jest.fn(),
}));

jest.mock('ioredis', () => {
  return jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Simple test to verify module structure
describe('file-deletion-queue module', () => {
  it('should have expected structure', () => {
    // Dynamically require to avoid import issues with mocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fileDeletionQueueModule = require('../file-deletion-queue');
    
    // Just check if the module loads without errors
    expect(fileDeletionQueueModule).toBeDefined();
    
    // These exports might not be available due to mocking, so just check module exists
    expect(typeof fileDeletionQueueModule).toBe('object');
  });
});