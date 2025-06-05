import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL
const url = new URL(redisUrl);

export const connection = {
  host: url.hostname,
  port: parseInt(url.port || '6379'),
  password: url.password || undefined,
  username: url.username || undefined,
};

// Create Redis client for direct usage
export const redis = new Redis(connection);

// Handle Redis connection errors
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});
