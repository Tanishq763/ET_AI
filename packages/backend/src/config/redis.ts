import Redis from 'ioredis';
import { env } from './env';

let redisConnection: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (!redisConnection) {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
    
    redisConnection.on('connect', () => {
      console.log('✅ Redis Connected successfully');
    });

    redisConnection.on('error', (err) => {
      console.error('❌ Redis Connection Error:', err);
    });
  }
  return redisConnection;
};
