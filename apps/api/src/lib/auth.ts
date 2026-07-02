import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type { JwtPayload } from '@email-provider/shared';
import { prisma } from '@email-provider/database';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export async function storeRefreshToken(userId: string, token: string, expiresAt: Date) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function validateRefreshToken(token: string) {
  const record = await prisma.refreshToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  return record;
}

export function toJwtPayload(user: {
  id: string;
  email: string;
  organizationId: string;
  role: JwtPayload['role'];
}): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
  };
}
