# Complete Guide — Local to Live Server (CI/CD + Docker)

Full documentation: develop on your PC → push to GitHub → automatic deploy to live server using **GitHub Actions**, **GHCR**, and **`docker-compose.prod.yml`**.

| Item | Value |
|------|--------|
| **Repo** | `https://github.com/avinashims/nodeapi` |
| **Branch** | `ecomm` |
| **Live server path** | `/var/www/ecommerce` |
| **Live URL** | `http://165.22.209.200` |

**Related docs:**
- [SERVER_SETUP_COMPLETE.md](./SERVER_SETUP_COMPLETE.md) — **full server install from scratch**
- [DEPLOY.md](./DEPLOY.md) — first-time server install (Docker, clone, firewall)
- [LOCAL_TO_LIVE.md](./LOCAL_TO_LIVE.md) — includes manual build method (`docker-compose.build.yml`)

---

## Table of contents

1. [Overview](#1-overview)
2. [Files you need](#2-files-you-need)
3. [One-time GitHub setup](#3-one-time-github-setup)
4. [One-time server setup](#4-one-time-server-setup)
5. [Daily workflow — move code local → live](#5-daily-workflow--move-code-local--live)
6. [What happens on each push (CI/CD pipeline)](#6-what-happens-on-each-push-cicd-pipeline)
7. [Manual deploy (optional)](#7-manual-deploy-optional)
8. [Debug & verify](#8-debug--verify)
9. [Database migrations](#9-database-migrations)
10. [Security rules](#10-security-rules)
11. [Troubleshooting](#11-troubleshooting)
12. [Quick command reference](#12-quick-command-reference)

---

## 1. Overview

### Architecture

```
┌──────────────┐     git push      ┌─────────────────────────────────────┐
│  YOUR PC     │ ───────────────►  │  GITHUB (branch: ecomm)             │
│  Edit code   │                   │  Actions: build-api + build-web     │
└──────────────┘                   │  Push images → GHCR                 │
                                   │  deploy job → SSH to server         │
                                   └─────────────────┬───────────────────┘
                                                     │
                                                     ▼
                                   ┌─────────────────────────────────────┐
                                   │  LIVE SERVER (DigitalOcean)         │
                                   │  docker-compose.prod.yml pull + up  │
                                   │                                     │
                                   │  Browser :80 → web (nginx)          │
                                   │              → /api/* → api:3000    │
                                   │              → mysql + redis        │
                                   └─────────────────────────────────────┘
```

### Docker containers on live server

| Container | Image source | Public port |
|-----------|--------------|-------------|
| **web** | `ghcr.io/avinashims/nodeapi/web:latest` | **80** |
| **api** | `ghcr.io/avinashims/nodeapi/api:latest` | internal 3000 |
| **mysql** | `mysql:8.0` | 3306 (optional) |
| **redis** | `redis:7-alpine` | internal |

### CI/CD vs manual build

| | **CI/CD (`prod.yml`)** ✅ You use this | Manual (`build.yml`) |
|--|----------------------------------------|----------------------|
| Build location | GitHub Actions | Server |
| Deploy command | Automatic on push | `up -d --build api` on server |
| SSH needed daily | **No** | Yes |
| Speed on server | Fast (pull image) | Slow (build on droplet) |

---

## 2. Files you need

These files are **already in the project**. You do not create new files for each deploy.

| File | Purpose |
|------|---------|
| `Dockerfile` | Builds API Docker image |
| `ecommerce-frontend/Dockerfile` | Builds frontend + nginx image |
| `docker-compose.prod.yml` | Runs pre-built images on live server |
| `.github/workflows/deploy.yml` | CI/CD: build + auto-deploy |
| `ecommerce-frontend/docker/nginx.conf` | Proxies `/api` → API container |
| `docker/entrypoint.sh` | Runs Prisma migrations, starts API |
| `.env.docker.example` | Template for server `.env` |

**Create once on server only (never commit to Git):**

| File | Purpose |
|------|---------|
| `/var/www/ecommerce/.env` | DB passwords, JWT secret, etc. |

**GitHub Secrets (not files):**

| Secret | Purpose |
|--------|---------|
| `DO_HOST` | Server IP |
| `DO_USER` | SSH user (`root`) |
| `DO_SSH_KEY` | Private SSH key for deploy |
| `GHCR_TOKEN` | GitHub token to pull images on server |

---

## 3. One-time GitHub setup

### 3.1 Enable workflow permissions

1. Repo → **Settings** → **Actions** → **General**
2. **Workflow permissions** → **Read and write permissions**
3. **Save**

Required to push Docker images to GitHub Container Registry (GHCR).

---

### 3.2 Create SSH key for deploy

On Windows **CMD**:

```cmd
ssh-keygen -t ed25519 -C "github-actions-deploy" -f %USERPROFILE%\.ssh\do_deploy
```

Press **Enter** twice for empty passphrase (required for CI/CD).

**Public key → server** (DigitalOcean Console):

```cmd
type %USERPROFILE%\.ssh\do_deploy.pub
```

On server (DO Console → Launch Droplet Console):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Paste the public key line. Save. Then:

```bash
chmod 600 ~/.ssh/authorized_keys
```

**Private key → GitHub secret** (never commit to Git):

```cmd
type %USERPROFILE%\.ssh\do_deploy
```

Copy from `-----BEGIN OPENSSH PRIVATE KEY-----` through `-----END OPENSSH PRIVATE KEY-----`.

---

### 3.3 Create GitHub Personal Access Token (GHCR_TOKEN)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Scopes: **`read:packages`**, **`write:packages`**
4. Copy token (`ghp_...`) — save only in GitHub Secrets

---

### 3.4 Add all GitHub Secrets

Repo → **Settings** → **Secrets and variables** → **Actions**

| Secret name | Example value |
|-------------|---------------|
| `DO_HOST` | `165.22.209.200` |
| `DO_USER` | `root` |
| `DO_SSH_KEY` | Full private key from `do_deploy` |
| `GHCR_TOKEN` | `ghp_xxxxxxxx` |

---

### 3.5 Make GHCR packages public (recommended)

After first successful build:

1. GitHub Profile → **Packages**
2. `nodeapi/api` → **Package settings** → **Public**
3. `nodeapi/web` → **Package settings** → **Public**

---

## 4. One-time server setup

See [DEPLOY.md](./DEPLOY.md) for full install. Summary:

```bash
# Install Docker, clone repo, create .env
mkdir -p /var/www && cd /var/www
git clone -b ecomm https://github.com/avinashims/nodeapi.git ecommerce
cd /var/www/ecommerce
cp .env.docker.example .env
nano .env
```

**Required in `.env`:**

```env
APP_PORT=80
GITHUB_REPOSITORY=avinashims/nodeapi
CLIENT_URL=http://165.22.209.200
MYSQL_ROOT_PASSWORD=...
MYSQL_USER=ecom_user
MYSQL_PASSWORD=...
JWT_SECRET=...
```

**Disable system nginx** (blocks port 80):

```bash
systemctl stop nginx
systemctl disable nginx
```

**Login to GHCR once:**

```bash
echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u avinashims --password-stdin
```

**First start with prod compose** (after GitHub Actions first green build):

```bash
cd /var/www/ecommerce
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl http://localhost/api/health
```

---

## 5. Daily workflow — move code local → live

This is what you do **every time** you change code.

### Step 1 — Edit code on your PC

```powershell
cd "C:\nodeapplication inprisma"
```

Edit files:
- API: `src/`
- Frontend: `ecommerce-frontend/src/`
- Database: `prisma/`

**API route rule:** routes must start with `/api` for live URL:

```javascript
// ✅ Works at http://165.22.209.200/api/total
app.get("/api/total", (req, res) => { ... });
```

---

### Step 2 — Commit and push

```powershell
git add .
git status
```

**Before commit — never include:**
- `.env`
- `login.txt`
- SSH private keys
- GitHub tokens (`ghp_...`)

```powershell
git commit -m "Describe your change"
git push origin ecomm
```

---

### Step 3 — Wait for GitHub Actions (automatic)

1. Open: `https://github.com/avinashims/nodeapi/actions`
2. Wait for **3 green jobs**:

| Job | What it does |
|-----|--------------|
| **build-api** | Builds API → pushes to GHCR |
| **build-web** | Builds frontend → pushes to GHCR |
| **deploy** | SSH to server → pull images → restart containers |

**You do NOT need to SSH to the server** — deploy runs automatically.

---

### Step 4 — Verify live site

Browser: `http://165.22.209.200`

Or check Actions **deploy** job logs — should show `docker compose ps` with all containers Up.

---

### Complete flow (one diagram)

```
1. PC:     edit src/index.js
2. PC:     git push origin ecomm
3. GitHub: build-api ✅  build-web ✅  deploy ✅
4. Live:   http://165.22.209.200 updated
```

**Total time:** ~3–8 minutes (no manual server work).

---

## 6. What happens on each push (CI/CD pipeline)

File: `.github/workflows/deploy.yml`

### Trigger

- Every **push** to `ecomm` or `main`
- Manual: **Actions → Run workflow**

### Job 1: build-api

- Builds `Dockerfile` (Node.js API)
- Pushes to `ghcr.io/avinashims/nodeapi/api:latest`

### Job 2: build-web

- Builds `ecommerce-frontend/Dockerfile` (React + nginx)
- Pushes to `ghcr.io/avinashims/nodeapi/web:latest`

### Job 3: deploy (automatic)

SSH into server and runs:

```bash
cd /var/www/ecommerce
git pull origin ecomm
echo "$GHCR_TOKEN" | docker login ghcr.io -u USER --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps
```

---

## 7. Manual deploy (optional)

Use if auto-deploy failed but builds succeeded.

### From GitHub

**Actions → Build and Deploy → Run workflow** → check **Deploy to DigitalOcean server**

### From SSH (fallback)

```bash
ssh root@165.22.209.200
cd /var/www/ecommerce
git pull origin ecomm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl http://localhost/api/health
```

Pull single service:

```bash
docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml up -d api
```

---

## 8. Debug & verify

### Check CI/CD status

| Check | Where |
|-------|--------|
| Builds green | GitHub → Actions |
| Images exist | GitHub → Packages → `nodeapi/api`, `nodeapi/web` |
| Secrets set | Repo → Settings → Secrets (4 secrets) |
| Deploy job green | Actions → latest run → deploy |

### Check live server (SSH optional)

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api --tail 50
curl http://localhost/api/health
curl http://localhost/api/products?page=1&limit=5
```

### View API logs (console.log)

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

### Verify code inside container

```bash
docker compose -f docker-compose.prod.yml exec api grep "your-route" src/index.js
```

---

## 9. Database migrations

### On PC — create migration

```powershell
npx prisma migrate dev --name describe_change
git add prisma/migrations
git commit -m "Add database migration"
git push origin ecomm
```

### On live — automatic

API entrypoint runs `prisma migrate deploy` when container starts.  
After push + deploy, migrations apply automatically.

---

## 10. Security rules

### Never commit to Git

| ❌ Never commit | ✅ Store instead |
|----------------|-----------------|
| `.env` | Server `/var/www/ecommerce/.env` |
| GitHub tokens `ghp_...` | GitHub Secret `GHCR_TOKEN` |
| SSH private key | GitHub Secret `DO_SSH_KEY` |
| `login.txt` with passwords | Password manager |
| MySQL passwords in code | Server `.env` |

### If push rejected: "repository rule violations"

GitHub blocked a **secret in your commit**. Fix:

```cmd
git fetch origin
git reset --soft origin/ecomm
git add .
git status
```

Ensure no secret files listed. Then:

```cmd
git commit -m "Your change without secrets"
git push origin ecomm
```

**Revoke** any exposed GitHub tokens immediately.

---

## 11. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Push rejected (rule violations) | Secret in commit | Remove file, reset, recommit |
| `ssh: no key found` in deploy | Bad `DO_SSH_KEY` secret | Paste full private key in GitHub Secrets |
| `Permission denied (publickey)` deploy | Public key not on server | Add `do_deploy.pub` to `authorized_keys` |
| Code on GitHub but not on live | Deploy job failed | Check Actions deploy logs |
| `Route not found` on live | Old image still running | Ensure deploy job green; re-run workflow |
| `pull access denied` | GHCR login failed | Fix `GHCR_TOKEN`; run `docker login ghcr.io` on server |
| `manifest unknown` | No image on GHCR yet | Wait for build-api/build-web green |
| Port 80 not working | web container down | `docker compose ps`; disable system nginx |
| MySQL 3306 conflict | Host mysql running | `systemctl stop mysql && disable mysql` |
| Changes not in container | Used `restart` only | Use deploy or `pull` + `up -d` |

### Deploy job failed — check secrets

All 4 must be set correctly:

```
DO_HOST=165.22.209.200
DO_USER=root
DO_SSH_KEY=<full private key>
GHCR_TOKEN=ghp_...
```

### Re-run failed deploy

**Actions** → failed run → **Re-run all jobs**

---

## 12. Quick command reference

### Daily — on PC only

```powershell
cd "C:\nodeapplication inprisma"
git add .
git commit -m "Your change"
git push origin ecomm
# Wait for Actions: build-api + build-web + deploy all green
# Test: http://165.22.209.200
```

### Manual deploy — on server

```bash
cd /var/www/ecommerce
git pull origin ecomm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Status & logs — on server

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
curl http://localhost/api/health
```

### Live URLs

```
http://165.22.209.200/                  → Frontend
http://165.22.209.200/api/health        → API health
http://165.22.209.200/api/products      → Products
http://165.22.209.200/api/auth/register → Register (POST)
```

---

## Checklist — CI/CD fully working

### GitHub
- [ ] Workflow permissions: Read and write
- [ ] Secrets: `DO_HOST`, `DO_USER`, `DO_SSH_KEY`, `GHCR_TOKEN`
- [ ] Push to `ecomm` → 3 jobs green (build-api, build-web, deploy)
- [ ] Packages `nodeapi/api` and `nodeapi/web` on GHCR

### Server (one-time)
- [ ] Repo at `/var/www/ecommerce`
- [ ] `.env` configured with `GITHUB_REPOSITORY=avinashims/nodeapi`
- [ ] System nginx disabled
- [ ] SSH public key in `authorized_keys`
- [ ] `docker login ghcr.io` done

### Daily test
- [ ] Push code from PC
- [ ] Actions all green
- [ ] Live site shows your change

---

*Branch: `ecomm` | Compose file: `docker-compose.prod.yml` | Auto-deploy: enabled on push*
