import { config } from '../config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('features.geolocation', () => {
    it('should return false when NEXT_PUBLIC_ENABLE_GEOLOCATION is not set', async () => {
      delete process.env.NEXT_PUBLIC_ENABLE_GEOLOCATION;
      jest.resetModules();
      const { config: freshConfig } = await import('../config');
      expect(freshConfig.features.geolocation).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_ENABLE_GEOLOCATION is set to false', async () => {
      process.env.NEXT_PUBLIC_ENABLE_GEOLOCATION = 'false';
      jest.resetModules();
      const { config: freshConfig } = await import('../config');
      expect(freshConfig.features.geolocation).toBe(false);
    });

    it('should return true when NEXT_PUBLIC_ENABLE_GEOLOCATION is set to true', async () => {
      process.env.NEXT_PUBLIC_ENABLE_GEOLOCATION = 'true';
      jest.resetModules();
      const { config: freshConfig } = await import('../config');
      expect(freshConfig.features.geolocation).toBe(true);
    });

    it('should return false when NEXT_PUBLIC_ENABLE_GEOLOCATION is set to any other value', async () => {
      process.env.NEXT_PUBLIC_ENABLE_GEOLOCATION = '1';
      jest.resetModules();
      const { config: freshConfig } = await import('../config');
      expect(freshConfig.features.geolocation).toBe(false);
    });
  });

  it('should export configuration as const', () => {
    expect(config).toMatchObject({
      features: {
        geolocation: expect.any(Boolean),
      },
    });
  });
});
