import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { API_PREFIX } from '@email-provider/shared';
import { config } from './config.js';
import { authenticate } from './lib/middleware.js';
import { authRoutes } from './routes/auth.js';
import { orgRoutes } from './routes/org.js';
import { userRoutes } from './routes/users.js';
import { domainRoutes } from './routes/domains.js';
import { mailboxRoutes } from './routes/mailboxes.js';
import { mailRoutes } from './routes/mail.js';
import { webhookRoutes } from './routes/webhooks.js';

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

app.decorate('authenticate', authenticate);

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: config.webUrl,
  credentials: true,
});
await app.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
});
await app.register(jwt, {
  secret: config.jwtSecret,
});

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

await app.register(
  async (api) => {
    await api.register(authRoutes, { prefix: '/auth' });
    await api.register(orgRoutes, { prefix: '/org' });
    await api.register(userRoutes, { prefix: '/users' });
    await api.register(domainRoutes, { prefix: '/domains' });
    await api.register(mailboxRoutes, { prefix: '/mailboxes' });
    await api.register(mailRoutes);
    await api.register(webhookRoutes, { prefix: '/webhooks' });
  },
  { prefix: API_PREFIX },
);

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`API server listening on port ${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: import('@email-provider/shared').JwtPayload;
    user: import('@email-provider/shared').JwtPayload;
  }
}
