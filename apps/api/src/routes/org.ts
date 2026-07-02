import type { FastifyInstance } from 'fastify';
import { updateOrgSchema } from '@email-provider/shared';
import { prisma } from '@email-provider/database';
import { getUser, requireAdmin } from '../lib/middleware.js';

export async function orgRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const user = getUser(request);
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        _count: { select: { users: true, domains: true } },
      },
    });
    return org;
  });

  app.patch('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = updateOrgSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const user = getUser(request);
    return prisma.organization.update({
      where: { id: user.organizationId },
      data: parsed.data,
    });
  });
}
