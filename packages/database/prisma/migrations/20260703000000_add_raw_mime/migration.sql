-- AlterTable
ALTER TABLE "emails_inbox" ADD COLUMN IF NOT EXISTS "rawMime" TEXT;
