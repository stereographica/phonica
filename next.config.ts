import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Image optimization configuration
  images: {
    domains: ['localhost'],
  },

  // Experimental features
  experimental: {
    // Enable server actions (already in use)
    serverActions: {
      bodySizeLimit: '100mb', // Match our file upload limit
    },
  },
};

export default nextConfig;
