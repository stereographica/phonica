import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Experimental features
  experimental: {
    // Enable server actions (already in use)
    serverActions: {
      bodySizeLimit: '100mb', // Match our file upload limit
    },
  },

  // Security headers with CSP for Leaflet maps
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' unpkg.com",
              "style-src 'self' 'unsafe-inline' unpkg.com",
              "img-src 'self' data: blob: *.tile.openstreetmap.org unpkg.com",
              "connect-src 'self' *.tile.openstreetmap.org",
              "font-src 'self' data:",
              "media-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
