-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('org_admin', 'user');

-- CreateEnum
CREATE TYPE "DomainVerificationStatus" AS ENUM ('pending', 'verified', 'failed');

-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('queued', 'sending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "EmailFolder" AS ENUM ('inbox', 'sent', 'trash', 'archive');

-- CreateEnum
CREATE TYPE "SesEventType" AS ENUM ('bounce', 'complaint', 'delivery');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verificationStatus" "DomainVerificationStatus" NOT NULL DEFAULT 'pending',
    "sesIdentityArn" TEXT,
    "dkimTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mailboxes" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "localPart" TEXT NOT NULL,
    "displayName" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mailbox_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_mailbox_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_threads" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "participantHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails_inbox" (
    "id" TEXT NOT NULL,
    "threadId" TEXT,
    "mailboxId" TEXT NOT NULL,
    "messageId" TEXT,
    "fromAddr" TEXT NOT NULL,
    "toAddrs" TEXT[],
    "ccAddrs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "rawS3Key" TEXT,
    "folder" "EmailFolder" NOT NULL DEFAULT 'inbox',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails_sent" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "threadId" TEXT,
    "messageId" TEXT,
    "fromAddr" TEXT NOT NULL,
    "toAddrs" TEXT[],
    "ccAddrs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bccAddrs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "status" "EmailSendStatus" NOT NULL DEFAULT 'queued',
    "sesMessageId" TEXT,
    "inReplyTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emails_sent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" TEXT NOT NULL,
    "emailSentId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ses_events" (
    "id" TEXT NOT NULL,
    "eventType" "SesEventType" NOT NULL,
    "messageId" TEXT,
    "emailAddress" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ses_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "domains_organizationId_idx" ON "domains"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "domains_organizationId_name_key" ON "domains"("organizationId", "name");

-- CreateIndex
CREATE INDEX "mailboxes_domainId_idx" ON "mailboxes"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "mailboxes_domainId_localPart_key" ON "mailboxes"("domainId", "localPart");

-- CreateIndex
CREATE INDEX "user_mailbox_access_userId_idx" ON "user_mailbox_access"("userId");

-- CreateIndex
CREATE INDEX "user_mailbox_access_mailboxId_idx" ON "user_mailbox_access"("mailboxId");

-- CreateIndex
CREATE UNIQUE INDEX "user_mailbox_access_userId_mailboxId_key" ON "user_mailbox_access"("userId", "mailboxId");

-- CreateIndex
CREATE INDEX "email_threads_mailboxId_lastMessageAt_idx" ON "email_threads"("mailboxId", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "emails_inbox_mailboxId_receivedAt_idx" ON "emails_inbox"("mailboxId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "emails_inbox_mailboxId_folder_idx" ON "emails_inbox"("mailboxId", "folder");

-- CreateIndex
CREATE INDEX "emails_inbox_threadId_idx" ON "emails_inbox"("threadId");

-- CreateIndex
CREATE INDEX "emails_sent_mailboxId_createdAt_idx" ON "emails_sent"("mailboxId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "emails_sent_mailboxId_status_idx" ON "emails_sent"("mailboxId", "status");

-- CreateIndex
CREATE INDEX "delivery_logs_emailSentId_idx" ON "delivery_logs"("emailSentId");

-- CreateIndex
CREATE INDEX "ses_events_messageId_idx" ON "ses_events"("messageId");

-- CreateIndex
CREATE INDEX "ses_events_eventType_idx" ON "ses_events"("eventType");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mailbox_access" ADD CONSTRAINT "user_mailbox_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mailbox_access" ADD CONSTRAINT "user_mailbox_access_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails_inbox" ADD CONSTRAINT "emails_inbox_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "email_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails_inbox" ADD CONSTRAINT "emails_inbox_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_emailSentId_fkey" FOREIGN KEY ("emailSentId") REFERENCES "emails_sent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
