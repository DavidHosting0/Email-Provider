import 'dotenv/config';

export const workerConfig = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  sesRegion: process.env.SES_REGION ?? 'eu-central-1',
  sesSmtpUser: process.env.SES_SMTP_USER ?? '',
  sesSmtpPass: process.env.SES_SMTP_PASS ?? '',
  sesInboundS3Bucket: process.env.SES_INBOUND_S3_BUCKET ?? '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10),
};
