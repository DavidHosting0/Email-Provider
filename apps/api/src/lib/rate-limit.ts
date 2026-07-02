import { redis } from './queue.js';
import { config } from '../config.js';
import { SEND_RATE_WINDOW_SECONDS } from '@email-provider/shared';

export async function checkSendRateLimit(mailboxId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `send-rate:${mailboxId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, SEND_RATE_WINDOW_SECONDS);
  }

  const limit = config.mailboxSendRateLimit;
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}
