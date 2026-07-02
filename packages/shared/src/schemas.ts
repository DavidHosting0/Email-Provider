import { z } from 'zod';

export const emailAddressSchema = z.string().email();

export const loginSchema = z.object({
  email: emailAddressSchema,
  password: z.string().min(8),
});

export const createUserSchema = z.object({
  email: emailAddressSchema,
  password: z.string().min(8),
  role: z.enum(['org_admin', 'user']).default('user'),
  name: z.string().min(1).max(100).optional(),
});

export const updateUserSchema = z.object({
  email: emailAddressSchema.optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['org_admin', 'user']).optional(),
  name: z.string().min(1).max(100).optional(),
});

export const createDomainSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i, 'Invalid domain name'),
});

export const createMailboxSchema = z.object({
  domainId: z.string().uuid(),
  localPart: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9._+-]+$/i, 'Invalid local part'),
  displayName: z.string().max(100).optional(),
});

export const updateMailboxSchema = z.object({
  displayName: z.string().max(100).optional(),
  isEnabled: z.boolean().optional(),
});

export const sendEmailSchema = z.object({
  to: z.array(emailAddressSchema).min(1),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  subject: z.string().min(1).max(998),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  inReplyTo: z.string().optional(),
  threadId: z.string().uuid().optional(),
});

export const updateEmailSchema = z.object({
  folder: z.enum(['inbox', 'trash', 'archive']).optional(),
  isRead: z.boolean().optional(),
});

export const assignMailboxAccessSchema = z.object({
  mailboxIds: z.array(z.string().uuid()),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type CreateMailboxInput = z.infer<typeof createMailboxSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
