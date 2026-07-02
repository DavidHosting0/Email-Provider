module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'apps/api/dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'email-worker',
      script: 'apps/worker/dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'web',
      script: 'apps/web/.next/standalone/apps/web/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '768M',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
