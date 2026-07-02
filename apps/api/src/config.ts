import 'dotenv/config';

export const config = {
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? '7', 10),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  sesRegion: process.env.SES_REGION ?? 'eu-central-1',
  sesSmtpUser: process.env.SES_SMTP_USER ?? '',
  sesSmtpPass: process.env.SES_SMTP_PASS ?? '',
  sesInboundS3Bucket: process.env.SES_INBOUND_S3_BUCKET ?? '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  mailboxSendRateLimit: parseInt(process.env.MAILBOX_SEND_RATE_LIMIT ?? '30', 10),
};
