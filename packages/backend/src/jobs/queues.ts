import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

const connection = getRedisConnection();

export const ingestionQueue = new Queue('ingestion', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const complianceQueue = new Queue('compliance', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
});
