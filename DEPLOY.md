# Deployment Guide — DigitalOcean + Docker + GitHub CI/CD

Complete steps to host the ecommerce app on a DigitalOcean droplet with Docker and GitHub Actions.

> **QA + Production with approval:** [QA_PRODUCTION_SETUP.md](./QA_PRODUCTION_SETUP.md)  
> **Complete server setup (zero to live):** [SERVER_SETUP_COMPLETE.md](./SERVER_SETUP_COMPLETE.md)  
> **Daily CI/CD workflow:** [CI_CD_COMPLETE_GUIDE.md](./CI_CD_COMPLETE_GUIDE.md)  
> **Manual build method:** [LOCAL_TO_LIVE.md](./LOCAL_TO_LIVE.md)

---

## Architecture

```
GitHub (push) → GitHub Actions → GHCR (Docker images)
                                      ↓
Browser → :80 (web/nginx) → /api/* → api:3000 → MySQL + Redis
```

| Container | Role |
|-----------|------|
| **web** | React frontend + Nginx (port 80) |
| **api** | Node.js Express API (internal port 3000) |
| **mysql** | Database (Prisma) |
| **redis** | Product/dashboard cache |

---

## Prerequisites

- DigitalOcean droplet (Ubuntu 22.04+, **2 GB RAM** recommended)
- GitHub repo: `https://github.com/avinashims/nodeapi` branch `ecomm`
- Domain optional (IP works for testing)

---

# PART 1 — DigitalOcean Droplet

## 1.1 Create droplet

1. [cloud.digitalocean.com](https://cloud.digitalocean.com) → **Create Droplet**
2. Image: **Ubuntu 22.04 LTS**
3. Plan: **Basic 2 GB RAM** (`s-1vcpu-2gb`)
4. Add SSH key
5. Create → note the **IP address**

## 1.2 Connect from Windows

```powershell
ssh root@YOUR_DROPLET_IP
```

---

# PART 2 — One-Time Server Setup

## 2.1 Install Docker

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

## 2.2 Stop system Nginx (important)

Host Nginx blocks port 80 and breaks the Docker web container:

```bash
systemctl stop nginx
systemctl disable nginx
```

## 2.3 Clone project

```bash
mkdir -p /var/www
cd /var/www
git clone -b ecomm https://github.com/avinashims/nodeapi.git ecommerce
cd /var/www/ecommerce
```

If the folder already exists with a broken layout (nested `nodeapi/` folder):

```bash
rm -rf /var/www/ecommerce
git clone -b ecomm https://github.com/avinashims/nodeapi.git ecommerce
```

## 2.4 Create environment file

```bash
cp .env.docker.example .env
nano .env
```

Example `.env`:

```env
APP_PORT=80

MYSQL_ROOT_PASSWORD=StrongRootPass123!
MYSQL_DATABASE=ecommerce_db
MYSQL_USER=ecom_user
MYSQL_PASSWORD=StrongDbPass123!

NODE_ENV=production
PORT=3000

JWT_SECRET=your-long-random-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_DAYS=7

CLIENT_URL=http://YOUR_DROPLET_IP

REDIS_URL=redis://redis:6379
REDIS_DEFAULT_TTL=300

RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
ADMIN_REGISTRATION_SECRET=change-this-admin-secret

GITHUB_REPOSITORY=avinashims/nodeapi
```

> Never commit `.env` to Git.

## 2.5 Web Nginx config (Docker DNS fix)

Ensure `ecommerce-frontend/docker/nginx.conf` contains the Docker DNS resolver:

```nginx
server {
    listen 80;
    server_name _;

    resolver 127.0.0.11 valid=10s ipv6=off;

    client_max_body_size 10M;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        set $backend http://api:3000;
        proxy_pass $backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        set $backend http://api:3000;
        proxy_pass $backend;
        proxy_set_header Host $host;
    }
}
```

## 2.6 First deploy (build on server)

```bash
cd /var/www/ecommerce
docker compose -f docker-compose.build.yml up -d --build
docker compose -f docker-compose.build.yml ps
```

All four services should show **Up**:

```
ecommerce-web-1     Up   0.0.0.0:80->80/tcp
ecommerce-api-1     Up (healthy)
ecommerce-mysql-1   Up (healthy)
ecommerce-redis-1   Up
```

## 2.7 Test

```bash
curl http://localhost/api/products?page=1&limit=5
curl http://localhost/api/health
```

Browser:

```
http://YOUR_DROPLET_IP/
http://YOUR_DROPLET_IP/api/products
```

## 2.8 Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable
```

---

# PART 3 — GitHub CI/CD

## 3.1 Enable workflow permissions

Repo → **Settings** → **Actions** → **General**

**Workflow permissions** → **Read and write permissions** → **Save**

Required for pushing Docker images to GitHub Container Registry (GHCR).

## 3.2 GitHub Actions secrets

Repo → **Settings** → **Secrets and variables** → **Actions**

| Secret | Value |
|--------|--------|
| `DO_HOST` | Droplet IP |
| `DO_USER` | `root` |
| `DO_SSH_KEY` | Private SSH key (full content) |
| `GHCR_TOKEN` | GitHub PAT with `read:packages` + `write:packages` |

### Create deploy SSH key (Windows)

```powershell
ssh-keygen -t ed25519 -C "github-actions" -f $env:USERPROFILE\.ssh\do_deploy
```

- Add **public** key (`do_deploy.pub`) to DigitalOcean droplet SSH keys
- Add **private** key to GitHub secret `DO_SSH_KEY`:

```powershell
Get-Content $env:USERPROFILE\.ssh\do_deploy
```

### Create GHCR token

GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token (classic)**

Scopes: `read:packages`, `write:packages`

## 3.3 CI/CD workflow

File: `.github/workflows/deploy.yml`

On push to `ecomm` or `main`:

| Job | Action |
|-----|--------|
| **build-api** | Build & push `ghcr.io/avinashims/nodeapi/api:latest` |
| **build-web** | Build & push `ghcr.io/avinashims/nodeapi/web:latest` |
| **deploy** | Automatic on push to `ecomm`/`main` (SSH to server, pull GHCR images) |

Check: GitHub → **Actions** → both build jobs must be **green**.

## 3.4 Make GHCR packages public (recommended)

Profile → **Packages** → `nodeapi/api` and `nodeapi/web`

**Package settings** → **Change visibility** → **Public**

## 3.5 Login to GHCR on server (once)

```bash
echo "ghp_YOUR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Use `--password-stdin` (not your account password in the flag).

---

# PART 4 — Deploy from GHCR

After GitHub Actions builds successfully:

```bash
cd /var/www/ecommerce
git pull origin ecomm

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

---

# PART 5 — Manual deploy from GitHub

**Actions** → **Build and Deploy** → **Run workflow**

- Branch: `ecomm`
- **Deploy to DigitalOcean server**: checked

Requires `DO_HOST`, `DO_USER`, `DO_SSH_KEY`, and `GHCR_TOKEN` secrets.

---

# PART 6 — Daily workflow

## On your PC (development)

```powershell
cd "C:\nodeapplication inprisma"
git add .
git commit -m "Your change"
git push origin ecomm
```

GitHub Actions builds new Docker images automatically.

## On server (update)

**Option A — Pull from GHCR:**

```bash
cd /var/www/ecommerce
git pull origin ecomm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

**Option B — Build on server:**

```bash
cd /var/www/ecommerce
git pull origin ecomm
docker compose -f docker-compose.build.yml up -d --build
```

---

# PART 7 — Useful commands

```bash
cd /var/www/ecommerce

# Container status
docker compose -f docker-compose.build.yml ps

# Logs
docker compose -f docker-compose.build.yml logs -f api
docker compose -f docker-compose.build.yml logs -f web

# Restart API
docker compose -f docker-compose.build.yml restart api

# Stop all
docker compose -f docker-compose.build.yml down

# Start all
docker compose -f docker-compose.build.yml up -d

# Health check (via nginx)
curl http://localhost/api/health
curl http://localhost/api/products?page=1&limit=5

# Health check (inside API container)
docker compose -f docker-compose.build.yml exec api wget -qO- http://localhost:3000/health
```

---

# PART 8 — Create admin user

```bash
curl -X POST http://localhost/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@example.com",
    "password": "password123",
    "adminSecret": "change-this-admin-secret"
  }'
```

Or promote an existing user in MySQL:

```bash
docker compose -f docker-compose.build.yml exec mysql \
  mysql -u ecom_user -p ecommerce_db \
  -e "UPDATE User SET role='ADMIN' WHERE email='admin@example.com';"
```

---

# PART 9 — SSL with domain (optional)

1. Point domain **A record** to droplet IP
2. Update `.env`: `CLIENT_URL=https://yourdomain.com`
3. Restart: `docker compose -f docker-compose.prod.yml up -d`
4. Add Certbot or Caddy for HTTPS in front of port 80

---

# PART 10 — Troubleshooting

| Problem | Solution |
|---------|----------|
| `curl localhost:3000` fails | Expected — API is internal. Use `curl localhost/api/products` |
| Port 80 connection refused | Check `docker compose ps` — web must be Up |
| web container **Restarting** | Add `resolver 127.0.0.11` to nginx.conf, rebuild web |
| 404 HTML from Ubuntu nginx | Run `systemctl stop nginx && systemctl disable nginx` |
| GHCR image not found | Wait for green Actions build, or use `docker-compose.build.yml` |
| GitHub Actions all red | Enable **Read and write** workflow permissions |
| `npm ci` fails in Actions | Fixed in Dockerfile with `npm ci --ignore-scripts` |
| `nodeapi/web` package missing | Check **build-web** job in Actions |
| Deploy job fails | Deploy is optional; use manual `docker compose` on server |
| Cache always MISS | Redis optional; API works without it |

---

# Deployment checklist

### Server

- [ ] Droplet created (2 GB RAM)
- [ ] Docker installed
- [ ] System nginx disabled
- [ ] Repo cloned to `/var/www/ecommerce`
- [ ] `.env` configured
- [ ] `nginx.conf` has Docker resolver
- [ ] `docker compose -f docker-compose.build.yml up -d --build`
- [ ] `curl http://localhost/api/products` returns JSON
- [ ] Browser opens `http://YOUR_IP`

### GitHub CI/CD

- [ ] Workflow permissions: Read and write
- [ ] Secrets: `DO_HOST`, `DO_USER`, `DO_SSH_KEY`, `GHCR_TOKEN`
- [ ] Push to `ecomm` → `build-api` + `build-web` green
- [ ] Packages `nodeapi/api` and `nodeapi/web` exist on GHCR
- [ ] Server: `docker login ghcr.io`
- [ ] Server: `docker compose -f docker-compose.prod.yml pull && up -d`

---

# File reference

| File | Purpose |
|------|---------|
| `Dockerfile` | API Docker image |
| `ecommerce-frontend/Dockerfile` | Web Docker image |
| `docker-compose.build.yml` | Build images on server |
| `docker-compose.prod.yml` | Pull images from GHCR |
| `docker-compose.yml` | Local development stack |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD |
| `.env.docker.example` | Environment template |
| `ecommerce-frontend/docker/nginx.conf` | Nginx reverse proxy config |
