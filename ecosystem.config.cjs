const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sharedEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  SES_REGION: process.env.SES_REGION,
  SES_SMTP_USER: process.env.SES_SMTP_USER,
  SES_SMTP_PASS: process.env.SES_SMTP_PASS,
  SES_INBOUND_S3_BUCKET: process.env.SES_INBOUND_S3_BUCKET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  WEB_URL: process.env.WEB_URL,
  API_PORT: process.env.API_PORT || '3001',
  MAILBOX_SEND_RATE_LIMIT: process.env.MAILBOX_SEND_RATE_LIMIT,
  WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
};

module.exports = {
  apps: [
    {
      name: 'mailplatform-api',
      script: 'apps/api/dist/index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      env: {
        ...sharedEnv,
      },
    },
    {
      name: 'mailplatform-worker',
      script: 'apps/worker/dist/index.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      merge_logs: true,
      env: {
        ...sharedEnv,
      },
    },
    {
      name: 'mailplatform-web',
      script: 'server.js',
      cwd: path.join(__dirname, 'apps/web/.next/standalone/apps/web'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '768M',
      error_file: path.join(__dirname, 'logs/web-error.log'),
      out_file: path.join(__dirname, 'logs/web-out.log'),
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.WEB_PORT || '3020',
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
