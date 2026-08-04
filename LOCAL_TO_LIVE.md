# Local to Live — Complete Deployment Guide

End-to-end guide: develop on your PC → push to GitHub → deploy to the live DigitalOcean server using Docker and CI/CD.

> **Full CI/CD guide (recommended):** [CI_CD_COMPLETE_GUIDE.md](./CI_CD_COMPLETE_GUIDE.md)  
> **First-time server install:** [DEPLOY.md](./DEPLOY.md)

**Repo:** `https://github.com/avinashims/nodeapi`  
**Branch:** `ecomm`  
**Live server:** `/var/www/ecommerce` on your droplet (e.g. `165.22.209.200`)

For first-time server setup (Docker install, clone, `.env`), see [DEPLOY.md](./DEPLOY.md).

---

## Table of contents

1. [How it works (architecture)](#1-how-it-works-architecture)
2. [Project layout](#2-project-layout)
3. [Local development (your PC)](#3-local-development-your-pc)
4. [Push code to GitHub](#4-push-code-to-github)
5. [CI/CD — GitHub Actions](#5-cicd--github-actions)
6. [Deploy to live server](#6-deploy-to-live-server)
7. [Daily workflow (cheat sheet)](#7-daily-workflow-cheat-sheet)
8. [Debug on live server](#8-debug-on-live-server)
9. [Database & Prisma migrations](#9-database--prisma-migrations)
10. [Common mistakes](#10-common-mistakes)
11. [Troubleshooting](#11-troubleshooting)
12. [File reference](#12-file-reference)

---

## 1. How it works (architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR PC (local)                                                │
│  Edit code → git commit → git push origin ecomm                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GITHUB                                                         │
│  Branch: ecomm                                                  │
│  Actions: build-api + build-web → push images to GHCR           │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   Method A: Build on server      Method B: Pull from GHCR
   docker-compose.build.yml         docker-compose.prod.yml
              │                             │
              └──────────────┬──────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LIVE SERVER (DigitalOcean)                                     │
│                                                                 │
│  Browser :80 → web (nginx) → /api/* → api:3000                  │
│                                    ↓                            │
│                              mysql + redis                      │
└─────────────────────────────────────────────────────────────────┘
```

| Container | Role | Exposed port |
|-----------|------|--------------|
| **web** | React app + Nginx reverse proxy | **80** (public) |
| **api** | Node.js Express API | 3000 (internal only) |
| **mysql** | Database | 3306 (optional, for Workbench) |
| **redis** | Cache | internal only |

**Important:** Users never hit `api:3000` directly. All API calls go through nginx:

```
http://YOUR_IP/api/products  →  nginx  →  api:3000/api/products
```

---

## 2. Project layout

```
nodeapplication inprisma/
├── src/                          # API source (Express routes, controllers)
├── prisma/                       # Database schema & migrations
├── Dockerfile                    # API Docker image
├── docker-compose.yml            # Local dev (optional)
├── docker-compose.build.yml      # Live: BUILD images on server
├── docker-compose.prod.yml       # Live: PULL images from GHCR
├── .env.docker.example           # Template for server .env
├── .github/workflows/deploy.yml  # CI/CD pipeline
└── ecommerce-frontend/
    ├── src/                      # React frontend
    ├── Dockerfile                # Web Docker image
    └── docker/nginx.conf         # Proxies /api → api:3000
```

| Compose file | When to use |
|--------------|-------------|
| `docker-compose.yml` | Test full stack locally on PC |
| `docker-compose.build.yml` | **Live server** — build images from source on the droplet |
| `docker-compose.prod.yml` | **Live server** — pull pre-built images from GitHub Container Registry |

---

## 3. Local development (your PC)

### 3.1 Prerequisites

- Node.js 20+
- Git
- Optional: Docker Desktop (to run full stack locally)

### 3.2 Run API locally (without Docker)

```powershell
cd "C:\nodeapplication inprisma"
npm install
cp .env.example .env   # edit DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev
npm run dev
```

API runs at `http://localhost:3000`.

### 3.3 Run frontend locally

```powershell
cd "C:\nodeapplication inprisma\ecommerce-frontend"
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 3.4 Run full stack with Docker (optional)

```powershell
cd "C:\nodeapplication inprisma"
docker compose up -d --build
```

Open `http://localhost` in the browser.

### 3.5 API route naming rule

Routes accessed through the live URL **must** start with `/api`:

```javascript
// ✅ Correct — works at http://YOUR_IP/api/total
app.get("/api/total", (req, res) => {
  res.json({ total: 218 });
});

// ❌ Wrong — nginx only forwards /api/* to the API
app.get("/total", (req, res) => { ... });
```

### 3.6 Add debug logs locally

```javascript
console.log("DEBUG body:", req.body);
```

View logs when running with `npm run dev` in the terminal, or with Docker:

```powershell
docker compose logs -f api
```

---

## 4. Push code to GitHub

After every change you want on live:

```powershell
cd "C:\nodeapplication inprisma"

git status
git add .
git commit -m "Describe your change clearly"
git push origin ecomm
```

**Rules:**

- Always work on branch **`ecomm`**
- Never commit `.env` (secrets stay on the server only)
- Push **before** deploying on the server

Verify on GitHub: repo → branch `ecomm` → your latest commit appears.

---

## 5. CI/CD — GitHub Actions

File: `.github/workflows/deploy.yml`

### What happens on every push to `ecomm` or `main`

| Job | Action |
|-----|--------|
| **build-api** | Builds API Docker image → pushes to `ghcr.io/avinashims/nodeapi/api:latest` |
| **build-web** | Builds Web Docker image → pushes to `ghcr.io/avinashims/nodeapi/web:latest` |
| **deploy** | **Manual only** — runs when you trigger workflow with "Deploy to server" checked |

Check status: GitHub → **Actions** → latest workflow run → both build jobs should be **green**.

### One-time CI/CD setup

1. **Repo → Settings → Actions → General**  
   Workflow permissions → **Read and write permissions**

2. **Repo → Settings → Secrets → Actions**

   | Secret | Value |
   |--------|--------|
   | `DO_HOST` | Droplet IP (e.g. `165.22.209.200`) |
   | `DO_USER` | `root` |
   | `DO_SSH_KEY` | Private SSH key for deploy |
   | `GHCR_TOKEN` | GitHub PAT with `read:packages` + `write:packages` |

3. **On server (once):** login to GHCR

   ```bash
   echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

4. **Optional:** Make packages public  
   GitHub Profile → Packages → `nodeapi/api` and `nodeapi/web` → Change visibility → Public

### Manual deploy from GitHub UI

1. **Actions** → **Build and Deploy** → **Run workflow**
2. Branch: `ecomm`
3. Check **Deploy to DigitalOcean server**
4. Run workflow

This SSHs into the server and runs `docker compose -f docker-compose.prod.yml pull && up -d`.

---

## 6. Deploy to live server

SSH into the server:

```bash
ssh root@165.22.209.200
cd /var/www/ecommerce
```

Always **`git pull` first**, then rebuild or pull images.

---

### Method A — Build on server (recommended while learning)

Uses `docker-compose.build.yml`. Builds Docker images **on the droplet** from source. No GHCR required.

```bash
cd /var/www/ecommerce
git pull origin ecomm

# Rebuild only what changed:
docker compose -f docker-compose.build.yml up -d --build api    # API changes
docker compose -f docker-compose.build.yml up -d --build web    # Frontend/nginx changes
docker compose -f docker-compose.build.yml up -d --build        # Both

# If changes still not appearing, force no cache:
docker compose -f docker-compose.build.yml build --no-cache api
docker compose -f docker-compose.build.yml up -d api
```

**Verify:**

```bash
docker compose -f docker-compose.build.yml ps
curl http://localhost/api/health
curl http://localhost/api/products?page=1&limit=5
```

---

### Method B — Pull from GHCR (CI/CD path)

Uses `docker-compose.prod.yml`. Pulls pre-built images from GitHub Container Registry.

**Prerequisite:** GitHub Actions build jobs must be green.

```bash
cd /var/www/ecommerce
git pull origin ecomm

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Pull only one service:

```bash
docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml up -d api
```

---

### Which method to use?

| Situation | Use |
|-----------|-----|
| Learning / GHCR not set up | **Method A** (`docker-compose.build.yml`) |
| CI/CD fully working | **Method B** (`docker-compose.prod.yml`) |
| Code change not showing after rebuild | Method A with `--no-cache` |
| Fast deploy after green Actions | Method B or manual workflow dispatch |

---

### What does NOT deploy code?

| Command | Effect |
|---------|--------|
| `docker compose restart api` | Restarts same old image — **no code update** |
| Edit files only on server | Lost on next `git pull` — **don't do this** |
| `git push` only (no server step) | GitHub updated, **live server unchanged** |
| `git pull` only (no rebuild) | Files on disk updated, **container still old** |

**You need both:** `git pull` **and** `--build` or `pull` + `up -d`.

---

## 7. Daily workflow (cheat sheet)

### API change (e.g. `src/controllers/authController.js`)

**PC:**

```powershell
cd "C:\nodeapplication inprisma"
# edit files
git add .
git commit -m "Fix login validation"
git push origin ecomm
```

**Server:**

```bash
cd /var/www/ecommerce
git pull origin ecomm
docker compose -f docker-compose.build.yml up -d --build api
curl http://localhost/api/health
```

---

### Frontend change (e.g. React components)

**PC:** same git push steps

**Server:**

```bash
git pull origin ecomm
docker compose -f docker-compose.build.yml up -d --build web
```

---

### Environment variable change (`.env` on server only)

```bash
nano /var/www/ecommerce/.env
docker compose -f docker-compose.build.yml up -d api
# no --build needed for .env-only changes
```

---

### Full deploy checklist

```
[ ] Code tested locally
[ ] git push origin ecomm
[ ] GitHub Actions green (if using GHCR)
[ ] ssh to server
[ ] git pull origin ecomm
[ ] docker compose up -d --build (or prod pull)
[ ] curl http://localhost/api/health
[ ] test in browser http://YOUR_IP
```

---

## 8. Debug on live server

### Container status

```bash
cd /var/www/ecommerce
docker compose -f docker-compose.build.yml ps
```

All four should be **Up**: `web`, `api`, `mysql`, `redis`.

### API logs (your "console" for console.log)

```bash
docker compose -f docker-compose.build.yml logs -f api
docker compose -f docker-compose.build.yml logs api --tail 100
```

### Test endpoints

```bash
# Through nginx (same as browser)
curl http://localhost/api/health
curl http://localhost/api/total
curl "http://localhost/api/products?page=1&limit=5"

# Direct inside API container
docker compose -f docker-compose.build.yml exec api wget -qO- http://localhost:3000/health
```

### Verify code inside running container

```bash
docker compose -f docker-compose.build.yml exec api grep "your-route" src/index.js
```

If empty → container is old → `git pull` + `build --no-cache api`.

### Enter API container

```bash
docker compose -f docker-compose.build.yml exec api sh
```

### MySQL on server

```bash
docker compose -f docker-compose.build.yml exec mysql mysql -u ecom_user -p ecommerce_db
```

### MySQL Workbench from PC

| Field | Value |
|-------|--------|
| Host | Droplet IP |
| Port | 3306 |
| User | `ecom_user` |
| Database | `ecommerce_db` |

---

## 9. Database & Prisma migrations

### Create migration on PC

```powershell
cd "C:\nodeapplication inprisma"
npx prisma migrate dev --name add_new_column
git add prisma/
git commit -m "Add migration: add_new_column"
git push origin ecomm
```

### Apply on live server

Migrations run automatically when the API container starts (`prisma migrate deploy` in entrypoint).

```bash
git pull origin ecomm
docker compose -f docker-compose.build.yml up -d --build api
docker compose -f docker-compose.build.yml logs api | grep -i migrate
```

---

## 10. Common mistakes

### "Route not found: GET /api/..."

**Cause:** Server running an old Docker image; code on disk updated but container not rebuilt.

**Fix:**

```bash
git pull origin ecomm
grep "your-route" src/index.js          # must find it on server
docker compose -f docker-compose.build.yml build --no-cache api
docker compose -f docker-compose.build.yml up -d api
docker compose -f docker-compose.build.yml exec api grep "your-route" src/index.js
```

---

### "Your branch is behind origin/ecomm"

**Cause:** You pushed from PC but didn't `git pull` on server.

**Fix:**

```bash
git stash                    # if you have local server edits
git pull origin ecomm
git stash pop                # if needed
docker compose -f docker-compose.build.yml up -d --build api
```

---

### Network error / site not loading

**Cause:** `web` container not running or system nginx blocking port 80.

**Fix:**

```bash
docker compose -f docker-compose.build.yml ps
systemctl stop nginx
systemctl disable nginx
docker compose -f docker-compose.build.yml up -d web
```

---

### MySQL port 3306 conflict

**Cause:** Host MySQL (`systemctl`) using port 3306.

**Fix:**

```bash
systemctl stop mysql
systemctl disable mysql
docker compose -f docker-compose.build.yml up -d mysql
```

Ensure `ports: "3306:3306"` is under **`mysql:`**, not **`web:`** in `docker-compose.build.yml`.

---

## 11. Troubleshooting

| Problem | Solution |
|---------|----------|
| `Route not found` after code change | `git pull` + `build --no-cache api` |
| `curl localhost:3000` fails | Expected — API is internal; use `curl localhost/api/...` |
| Port 80 connection refused | Start `web` container; disable system nginx |
| web container restarting | Rebuild web; ensure `resolver 127.0.0.11` in nginx.conf |
| GHCR image not found | Wait for green Actions build; or use `docker-compose.build.yml` |
| GitHub Actions failing | Enable Read and write workflow permissions |
| Changes on PC not on live | Missing `git push` or missing server `git pull` + rebuild |
| `restart api` doesn't help | Use `up -d --build api` instead |
| MySQL Workbench can't connect | Map port 3306 on mysql; stop host mysql; open firewall |

---

## 12. File reference

| File | Purpose |
|------|---------|
| `src/` | API source code |
| `ecommerce-frontend/` | React frontend |
| `Dockerfile` | API image build instructions |
| `ecommerce-frontend/Dockerfile` | Web image build instructions |
| `docker-compose.build.yml` | Live: build on server |
| `docker-compose.prod.yml` | Live: pull from GHCR |
| `docker-compose.yml` | Local full stack |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `.env.docker.example` | Server environment template |
| `ecommerce-frontend/docker/nginx.conf` | Nginx proxy config |
| `docker/entrypoint.sh` | Runs migrations + starts API |
| [DEPLOY.md](./DEPLOY.md) | First-time server setup guide |

---

## Quick command reference

### PC (PowerShell)

```powershell
cd "C:\nodeapplication inprisma"
git add . && git commit -m "message" && git push origin ecomm
```

### Live server (SSH)

```bash
cd /var/www/ecommerce
git pull origin ecomm
docker compose -f docker-compose.build.yml up -d --build api   # or web, or no service name for all
docker compose -f docker-compose.build.yml ps
docker compose -f docker-compose.build.yml logs -f api
curl http://localhost/api/health
```

### Live URLs

```
http://165.22.209.200/              → Frontend
http://165.22.209.200/api/health      → API health
http://165.22.209.200/api/products    → Products API
```

---

*Last updated for branch `ecomm`, Docker Compose v2, DigitalOcean Ubuntu 22.04.*
