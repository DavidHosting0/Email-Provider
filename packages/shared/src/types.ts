export type UserRole = 'org_admin' | 'user';

export type EmailStatus = 'queued' | 'sending' | 'sent' | 'failed';

export type DomainVerificationStatus = 'pending' | 'verified' | 'failed';

export type EmailFolder = 'inbox' | 'sent' | 'trash' | 'archive';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  purpose: string;
}
