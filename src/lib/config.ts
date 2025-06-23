/**
 * Application configuration loaded from environment variables
 */

export const config = {
  features: {
    /**
     * Enable browser geolocation API for current location features
     * Default: false (disabled)
     * Set NEXT_PUBLIC_ENABLE_GEOLOCATION=true to enable
     */
    geolocation: process.env.NEXT_PUBLIC_ENABLE_GEOLOCATION === 'true',
  },
} as const;

// Type-safe configuration
export type AppConfig = typeof config;
