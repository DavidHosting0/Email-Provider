import type { FastifyInstance } from 'fastify';
import { loginSchema } from '@email-provider/shared';
import { prisma } from '@email-provider/database';
import {
  verifyPassword,
  generateRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  validateRefreshToken,
  toJwtPayload,
} from '../lib/auth.js';
import { config } from '../config.js';
import { getUser } from '../lib/middleware.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { organization: true },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const payload = toJwtPayload(user);
    const accessToken = app.jwt.sign(payload, { expiresIn: config.accessTokenTtl });
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.refreshTokenTtlDays);
    await storeRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    };
  });

  app.post('/refresh', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    if (!body.refreshToken) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }

    const record = await validateRefreshToken(body.refreshToken);
    if (!record) {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }

    await revokeRefreshToken(body.refreshToken);

    const payload = toJwtPayload(record.user);
    const accessToken = app.jwt.sign(payload, { expiresIn: config.accessTokenTtl });
    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.refreshTokenTtlDays);
    await storeRefreshToken(record.user.id, newRefreshToken, expiresAt);

    return { accessToken, refreshToken: newRefreshToken };
  });

  app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    if (body.refreshToken) {
      await revokeRefreshToken(body.refreshToken);
    }
    return reply.status(204).send();
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwtUser = getUser(request);
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.sub },
      include: { organization: true },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };
  });
}
