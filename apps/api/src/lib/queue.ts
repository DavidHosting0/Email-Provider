import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { QUEUE_NAMES, parseRedisUrl } from '@email-provider/shared';
import { config } from '../config.js';

const redisConnection = parseRedisUrl(config.redisUrl);

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const outboundQueue = new Queue(QUEUE_NAMES.OUTBOUND_SEND, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export const inboundQueue = new Queue(QUEUE_NAMES.INBOUND_INGEST, {
  connection: { ...redisConnection },
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
  },
});
