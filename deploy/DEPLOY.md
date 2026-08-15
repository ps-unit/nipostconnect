# NiPOST Connect — Production Deployment Guide

## Prerequisites (Ubuntu 22.04 LTS)

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2
sudo npm install -g pm2

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 1: Clone and configure

```bash
# As your deploy user (not root)
cd /var/www
git clone https://github.com/your-org/nipost-connect.git
cd nipost-connect

# Install dependencies
cd server && npm install --omit=dev
cd ../client && npm install && npm run build
cd ..

# Configure environment
cp .env.production.example server/.env
nano server/.env          # Fill in all values

# Create log and upload directories
mkdir -p logs
mkdir -p server/uploads/{images,documents,avatars,org}
chmod 755 deploy/backup.sh deploy/restore.sh
```

---

## Step 2: PostgreSQL setup

```bash
sudo -u postgres psql << 'SQL'
CREATE USER nipost_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE nipost_connect OWNER nipost_user;
GRANT ALL PRIVILEGES ON DATABASE nipost_connect TO nipost_user;
SQL

# Run migrations and seed
cd server
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run uploads:init
```

---

## Step 3: Nginx + SSL

```bash
# Copy config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/nipost-connect
sudo ln -s /etc/nginx/sites-available/nipost-connect /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d connect.nipost.gov.ng

# Reload
sudo systemctl reload nginx
```

---

## Step 4: PM2

```bash
# Start the app
pm2 start ecosystem.config.js --env production

# Save PM2 config (so it restarts on reboot)
pm2 save
pm2 startup    # Follow the command it prints

# Useful PM2 commands:
pm2 status
pm2 logs nipost-connect
pm2 restart nipost-connect
pm2 reload nipost-connect      # Zero-downtime reload
pm2 monit
```

---

## Step 5: Automated Backups

```bash
# Add to crontab (runs daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /var/www/nipost-connect/deploy/backup.sh >> /var/log/nipost-backup.log 2>&1
```

---

## Step 6: Post-deployment checklist

- [ ] `GET https://connect.nipost.gov.ng/api/health` returns `{"status":"ok"}`
- [ ] Login as PMG works
- [ ] WebSocket connections work (check browser console for Socket.io connection)
- [ ] File uploads work (upload a test image in a channel)
- [ ] Push notifications work (subscribe in browser settings)
- [ ] Password reset email arrives (test with a real nipost.gov.ng address)
- [ ] SSL certificate is valid (padlock in browser)
- [ ] PM2 shows `online` status: `pm2 status`
- [ ] Backup runs: `sudo bash /var/www/nipost-connect/deploy/backup.sh`

---

## Step 7: Updates (zero-downtime)

```bash
cd /var/www/nipost-connect
git pull

# Server changes only:
cd server && npm install --omit=dev
npx prisma migrate deploy
pm2 reload nipost-connect

# Frontend changes:
cd client && npm install && npm run build
# (Nginx serves the built files — no restart needed)
```

---

## Monitoring

PM2 Dashboard:
```bash
pm2 monit
pm2 logs nipost-connect --lines 100
```

Nginx logs:
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

PostgreSQL connections:
```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='nipost_connect';"
```

---

## Firewall rules (UFW)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 5000/tcp     # Block direct Node.js port from outside
sudo ufw enable
```

---

## Environment Security

```bash
# Permissions on .env
chmod 600 server/.env
chown deploy_user:deploy_user server/.env

# Rotate JWT secrets (invalidates all sessions — staff must re-login):
# 1. Generate new secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# 2. Update server/.env
# 3. pm2 reload nipost-connect
```
