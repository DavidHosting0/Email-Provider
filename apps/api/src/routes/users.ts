import type { FastifyInstance } from 'fastify';
import { createUserSchema, updateUserSchema, assignMailboxAccessSchema } from '@email-provider/shared';
import { prisma } from '@email-provider/database';
import { getUser, requireAdmin } from '../lib/middleware.js';
import { hashPassword } from '../lib/auth.js';

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/', async (request) => {
    const user = getUser(request);
    return prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        mailboxAccess: { select: { mailboxId: true } },
      },
    });
  });

  app.post('/', async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const currentUser = getUser(request);
    const passwordHash = await hashPassword(parsed.data.password);

    try {
      const user = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
          name: parsed.data.name,
          role: parsed.data.role,
          organizationId: currentUser.organizationId,
        },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      return reply.status(201).send(user);
    } catch {
      return reply.status(409).send({ error: 'User already exists' });
    }
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const currentUser = getUser(request);
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: currentUser.organizationId },
    });
    if (!existing) return reply.status(404).send({ error: 'User not found' });

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.password) {
      data.passwordHash = await hashPassword(parsed.data.password);
      delete data.password;
    }

    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = getUser(request);

    if (id === currentUser.sub) {
      return reply.status(400).send({ error: 'Cannot delete yourself' });
    }

    const existing = await prisma.user.findFirst({
      where: { id, organizationId: currentUser.organizationId },
    });
    if (!existing) return reply.status(404).send({ error: 'User not found' });

    await prisma.user.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.post('/:id/mailboxes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = assignMailboxAccessSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }

    const currentUser = getUser(request);
    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: currentUser.organizationId },
    });
    if (!targetUser) return reply.status(404).send({ error: 'User not found' });

    const validMailboxes = await prisma.mailbox.findMany({
      where: {
        id: { in: parsed.data.mailboxIds },
        domain: { organizationId: currentUser.organizationId },
      },
      select: { id: true },
    });

    await prisma.userMailboxAccess.deleteMany({ where: { userId: id } });
    await prisma.userMailboxAccess.createMany({
      data: validMailboxes.map((m) => ({ userId: id, mailboxId: m.id })),
    });

    return { mailboxIds: validMailboxes.map((m) => m.id) };
  });
}
