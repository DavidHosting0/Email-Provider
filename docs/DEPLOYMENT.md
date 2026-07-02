# Deployment Guide — Hetzner Linux + PM2

Deploy MailPlatform on a Hetzner Linux server alongside existing PM2-managed Node.js services.

## Server Requirements

- Ubuntu 22.04+ or Debian 12+
- 2 GB RAM minimum (4 GB recommended)
- Node.js 20 LTS
- Docker + Docker Compose
- PM2 (global)
- Nginx + Certbot

## 1. Install Dependencies

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm@9

# PM2
npm install -g pm2

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Nginx + Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## 2. Clone and Configure

```bash
sudo mkdir -p /opt/email-provider
sudo chown $USER:$USER /opt/email-provider
git clone <your-repo-url> /opt/email-provider
cd /opt/email-provider

cp .env.example .env
# Edit .env with production values
nano .env
```

## 3. Start Infrastructure (Docker)

```bash
docker compose up -d
docker compose ps   # verify postgres + redis are healthy
```

## 4. Build and Migrate

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed      # creates initial org + admin user
pnpm build
```

## 5. Start Application (PM2)

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup       # follow instructions for auto-start on reboot
```

Verify processes:

```bash
pm2 status
# api-server   — port 3001
# email-worker — background queue processor
# web          — port 3000
```

## 6. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/mailplatform`:

```nginx
server {
    listen 80;
    server_name mail.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SNS webhooks may send large payloads
        client_max_body_size 10M;
    }
}
```

Enable and get TLS:

```bash
sudo ln -s /etc/nginx/sites-available/mailplatform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d mail.yourdomain.com
```

Update `.env`:

```
WEB_URL=https://mail.yourdomain.com
NEXT_PUBLIC_API_URL=https://mail.yourdomain.com/api/v1
```

Rebuild web after changing `NEXT_PUBLIC_API_URL`:

```bash
pnpm --filter @email-provider/web build
pm2 restart web
```

## 7. Coexistence with Existing PM2 Apps

MailPlatform uses dedicated process names (`api-server`, `email-worker`, `web`) and ports 3000/3001. If these conflict with existing services:

1. Change `API_PORT` and `WEB_PORT` in `.env`
2. Update Nginx `proxy_pass` targets accordingly
3. Update `ecosystem.config.cjs` web `PORT` env

Existing PM2 apps are unaffected — they run as separate named processes.

## 8. Updates and Maintenance

```bash
cd /opt/email-provider
git pull
pnpm install
pnpm db:migrate
pnpm build
pm2 restart all
```

### Logs

```bash
pm2 logs api-server
pm2 logs email-worker
pm2 logs web

# Or check log files
tail -f logs/api-out.log
tail -f logs/worker-out.log
```

### Database Backup

```bash
docker exec mailplatform-postgres pg_dump -U mail mailplatform > backup.sql
```

### Health Check

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"..."}
```

## 9. Security Hardening

- Bind Postgres and Redis to localhost only (default in docker-compose.yml)
- Use strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Keep SES credentials in `.env` only (never commit)
- Enable UFW: allow 22, 80, 443 only
- Set up fail2ban for SSH
- Rotate refresh tokens and SMTP credentials periodically

## 10. Troubleshooting

| Issue | Check |
|-------|-------|
| Emails not sending | `pm2 logs email-worker`, verify SES SMTP creds, check sandbox mode |
| Inbound not arriving | Verify MX record, SES receipt rule, SNS subscription status |
| 401 on API | JWT expired; check refresh token flow |
| Queue backlog | `redis-cli LLEN bull:outbound-send:wait` |
| DB connection refused | `docker compose ps`, verify DATABASE_URL |
