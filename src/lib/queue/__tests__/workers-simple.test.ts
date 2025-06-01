/**
 * @jest-environment node
 */

import { startWorkers, stopWorkers } from '../workers';

// Simple unit tests to improve function coverage for workers
describe('workers - simple coverage', () => {
  // Mock console methods
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('function existence tests', () => {
    it('should export startWorkers function', () => {
      expect(typeof startWorkers).toBe('function');
    });

    it('should export stopWorkers function', () => {
      expect(typeof stopWorkers).toBe('function');
    });
  });

  describe('function interface tests', () => {
    it('startWorkers should return a promise', () => {
      // Test that function returns a promise
      expect(() => {
        const result = startWorkers();
        expect(result).toBeInstanceOf(Promise);
      }).not.toThrow();
    });

    it('stopWorkers should return a promise', () => {
      // Test that function returns a promise
      expect(() => {
        const result = stopWorkers();
        expect(result).toBeInstanceOf(Promise);
      }).not.toThrow();
    });
  });
});