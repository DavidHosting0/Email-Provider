import { prisma } from '@email-provider/database';

const emails = await prisma.emailInbox.findMany({
  orderBy: { receivedAt: 'desc' },
  take: 5,
  select: {
    id: true,
    subject: true,
    bodyHtml: true,
    bodyText: true,
    rawS3Key: true,
    fromAddr: true,
  },
});

for (const e of emails) {
  console.log(JSON.stringify({
    id: e.id,
    from: e.fromAddr,
    subject: e.subject?.slice(0, 50),
    htmlLen: e.bodyHtml?.length ?? 0,
    textLen: e.bodyText?.length ?? 0,
    htmlPreview: e.bodyHtml?.slice(0, 120) ?? null,
    textPreview: e.bodyText?.slice(0, 80) ?? null,
    rawS3Key: e.rawS3Key,
  }));
}

await prisma.$disconnect();
