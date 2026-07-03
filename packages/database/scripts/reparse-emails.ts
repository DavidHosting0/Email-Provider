import { prisma } from '@email-provider/database';
import { reparseEmailBodyFromS3, needsBodyReparse } from '@email-provider/email';

const s3Config = {
  region: process.env.SES_REGION ?? 'eu-central-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  bucket: process.env.SES_INBOUND_S3_BUCKET ?? '',
  prefix: process.env.SES_INBOUND_S3_PREFIX ?? 'inbound/',
};

if (!s3Config.bucket) {
  console.error('SES_INBOUND_S3_BUCKET is required');
  process.exit(1);
}

const emails = await prisma.emailInbox.findMany({
  where: { rawS3Key: { not: null } },
  select: {
    id: true,
    messageId: true,
    bodyHtml: true,
    bodyText: true,
    rawS3Key: true,
    subject: true,
  },
});

let updated = 0;
let failed = 0;

for (const email of emails) {
  if (!needsBodyReparse(email) && email.bodyHtml?.trim()) continue;

  try {
    const fresh = await reparseEmailBodyFromS3(email, s3Config);
    if (!fresh?.bodyHtml && !fresh?.bodyText) {
      failed++;
      console.warn('No content parsed:', email.id, email.subject);
      continue;
    }

    await prisma.emailInbox.update({
      where: { id: email.id },
      data: { bodyHtml: fresh.bodyHtml, bodyText: fresh.bodyText ?? email.bodyText },
    });
    updated++;
    console.log('Updated:', email.subject?.slice(0, 60));
  } catch (err) {
    failed++;
    console.warn('Failed:', email.id, err instanceof Error ? err.message : err);
  }
}

console.log(`Done. Updated ${updated}, failed ${failed}, skipped ${emails.length - updated - failed}`);
await prisma.$disconnect();
