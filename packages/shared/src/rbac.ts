import type { JwtPayload, UserRole } from './types.js';

export function isOrgAdmin(user: Pick<JwtPayload, 'role'>): boolean {
  return user.role === 'org_admin';
}

export function requireOrgAdmin(user: Pick<JwtPayload, 'role'>): void {
  if (!isOrgAdmin(user)) {
    throw new Error('FORBIDDEN');
  }
}

export function canAccessMailbox(
  user: JwtPayload,
  mailboxId: string,
  accessibleMailboxIds: string[],
): boolean {
  if (isOrgAdmin(user)) return true;
  return accessibleMailboxIds.includes(mailboxId);
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  org_admin: 2,
  user: 1,
};
