import { prisma } from '@email-provider/database';
import { hydrateEmailBody } from '@email-provider/email';

const s3Config = {
  region: process.env.SES_REGION ?? 'eu-central-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  bucket: process.env.SES_INBOUND_S3_BUCKET ?? '',
  prefix: process.env.SES_INBOUND_S3_PREFIX ?? 'inbound/',
};

const emails = await prisma.emailInbox.findMany({
  orderBy: { receivedAt: 'desc' },
  select: {
    id: true,
    messageId: true,
    subject: true,
    bodyHtml: true,
    bodyText: true,
    rawMime: true,
    rawS3Key: true,
  },
});

let updated = 0;
let skipped = 0;

for (const email of emails) {
  const hydrated = await hydrateEmailBody(
    email,
    s3Config.bucket ? s3Config : undefined,
  );

  if (!hydrated.updated) {
    skipped++;
    continue;
  }

  await prisma.emailInbox.update({
    where: { id: email.id },
    data: {
      bodyHtml: hydrated.bodyHtml,
      bodyText: hydrated.bodyText,
    },
  });
  updated++;
  console.log('Updated:', email.subject?.slice(0, 60));
}

console.log(`Done. Updated ${updated}, skipped ${skipped}`);
await prisma.$disconnect();
