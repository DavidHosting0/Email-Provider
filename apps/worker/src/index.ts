import { startOutboundWorker } from './queues/outbound.js';
import { startInboundWorker } from './queues/inbound.js';
import pino from 'pino';

const logger = pino({
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

logger.info('Starting email workers...');

startOutboundWorker();
startInboundWorker();

process.on('SIGTERM', () => {
  logger.info('Shutting down workers...');
  process.exit(0);
});
