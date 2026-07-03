import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from '@email-provider/shared';
import { isOrgAdmin } from '@email-provider/shared';
import { prisma } from '@email-provider/database';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export function getUser(request: FastifyRequest): JwtPayload {
  return request.user as JwtPayload;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = getUser(request);
  if (!isOrgAdmin(user)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
}

export async function getAccessibleMailboxIds(user: JwtPayload): Promise<string[]> {
  const mailboxes = await prisma.mailbox.findMany({
    where: { domain: { organizationId: user.organizationId } },
    select: { id: true },
  });
  return mailboxes.map((m) => m.id);
}

export async function requireMailboxAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  mailboxId: string,
) {
  const user = getUser(request);
  const accessible = await getAccessibleMailboxIds(user);
  if (!accessible.includes(mailboxId)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
}

export async function getMailboxWithDomain(mailboxId: string, organizationId: string) {
  return prisma.mailbox.findFirst({
    where: { id: mailboxId, domain: { organizationId } },
    include: { domain: true },
  });
}
