import type { FastifyInstance } from 'fastify';
import { createDomainSchema } from '@email-provider/shared';
import { prisma } from '@email-provider/database';
import { getDnsInstructions } from '@email-provider/email';
import { getUser } from '../lib/middleware.js';
import { config } from '../config.js';

export async function domainRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const user = getUser(request);
    return prisma.domain.findMany({
      where: { organizationId: user.organizationId },
      include: { _count: { select: { mailboxes: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  app.post('/', async (request, reply) => {
    const parsed = createDomainSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const user = getUser(request);
    const name = parsed.data.name.toLowerCase();

    try {
      const domain = await prisma.domain.create({
        data: {
          name,
          organizationId: user.organizationId,
        },
      });
      return reply.status(201).send(domain);
    } catch {
      return reply.status(409).send({ error: 'Domain already exists' });
    }
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);

    const domain = await prisma.domain.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { mailboxes: true },
    });
    if (!domain) return reply.status(404).send({ error: 'Domain not found' });
    return domain;
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);

    const domain = await prisma.domain.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!domain) return reply.status(404).send({ error: 'Domain not found' });

    await prisma.domain.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get('/:id/dns-instructions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);

    const domain = await prisma.domain.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!domain) return reply.status(404).send({ error: 'Domain not found' });

    const records = getDnsInstructions(domain.name, config.sesRegion, domain.dkimTokens);
    return {
      domain: domain.name,
      verificationStatus: domain.verificationStatus,
      records,
      webhookUrl: `${config.webUrl}/api/v1/webhooks/ses/inbound`,
    };
  });
}
