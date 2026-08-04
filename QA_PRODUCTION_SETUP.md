# QA + Production Environments — Setup Guide

Two environments with **approval before production**:

```
Push code → QA (automatic) → Test → Approve → Production
```

| Environment | URL example | Auto deploy | Approval |
|-------------|-------------|-------------|----------|
| **QA** | `http://QA_IP:8080` | ✅ On every push to `ecomm` | No |
| **Production** | `http://PROD_IP` | ❌ Manual promote only | **Yes — required** |

---

## Table of contents

1. [How it works](#1-how-it-works)
2. [Architecture options](#2-architecture-options)
3. [GitHub setup](#3-github-setup)
4. [QA server setup](#4-qa-server-setup)
5. [Production server setup](#5-production-server-setup)
6. [Daily workflow](#6-daily-workflow)
7. [Promote QA → Production](#7-promote-qa--production)
8. [Files reference](#8-files-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. How it works

```
┌─────────────┐   git push    ┌──────────────────────────────────────┐
│  YOUR PC    │ ────────────► │  GITHUB (branch: ecomm)              │
└─────────────┘               │  1. build-api + build-web            │
                              │     tags: :qa and :commit-sha        │
                              │  2. deploy-qa → QA server (auto)     │
                              └──────────────────┬───────────────────┘
                                                 │
                    Test on QA ◄─────────────────┘
                    http://QA_IP:8080
                                                 │
                    You approve in GitHub ◄──────┘
                                                 │
                              ┌──────────────────▼───────────────────┐
                              │  3. deploy-production (manual)       │
                              │     Requires "production" approval     │
                              │     Promotes :qa → :latest           │
                              │     Deploys to Production server     │
                              └──────────────────┬───────────────────┘
                                                 │
                    Live users ◄─────────────────┘
                    http://PROD_IP
```

### Docker image tags

| Tag | Used by | When |
|-----|---------|------|
| `:qa` | QA environment | Every push to `ecomm` |
| `:latest` | Production | After approval + promote |
| `:commit-sha` | Both | Exact version reference |

---

## 2. Architecture options

### Option A — Two servers (recommended)

| Server | Path | Port | Secret |
|--------|------|------|--------|
| QA droplet | `/var/www/ecommerce-qa` | **8080** | `QA_HOST` |
| Prod droplet | `/var/www/ecommerce` | **80** | `PROD_HOST` |

Best isolation — separate databases, no risk to live users.

### Option B — One server (budget)

Same IP, different folders and ports:

| Environment | Path | Port |
|-------------|------|------|
| QA | `/var/www/ecommerce-qa` | **8080** |
| Production | `/var/www/ecommerce` | **80** |

Set both secrets to same IP:

```
QA_HOST=165.22.209.200
PROD_HOST=165.22.209.200
```

Separate Docker volumes = separate QA and prod databases.

---

## 3. GitHub setup

### 3.1 Create Environments

Repo → **Settings** → **Environments**

#### Environment: `qa`

- No required reviewers (auto deploy)
- Optional: deployment branch rule → `ecomm` only

#### Environment: `production`

- ✅ **Required reviewers** — add yourself (and team leads)
- Deployment branch: `ecomm` or `main`
- This blocks production deploy until someone clicks **Approve**

### 3.2 GitHub Secrets

**Settings** → **Secrets** → **Actions**

| Secret | Example | Purpose |
|--------|---------|---------|
| `QA_HOST` | `165.22.209.200` or QA droplet IP | QA server |
| `PROD_HOST` | `165.22.209.200` or prod droplet IP | Production server |
| `DO_USER` | `root` | SSH user (both servers) |
| `DO_SSH_KEY` | private key | SSH deploy key |
| `GHCR_TOKEN` | `ghp_...` | Pull Docker images |

> You can remove old `DO_HOST` secret — replaced by `QA_HOST` + `PROD_HOST`.

### 3.3 Workflow permissions

**Settings** → **Actions** → **General** → **Read and write permissions**

---

## 4. QA server setup

SSH to QA server (or same server):

```bash
ssh root@YOUR_QA_IP
```

### 4.1 Install Docker & Git (if new server)

See [SERVER_SETUP_COMPLETE.md](./SERVER_SETUP_COMPLETE.md) Part C.

### 4.2 Clone project for QA

```bash
mkdir -p /var/www
cd /var/www
git clone -b ecomm https://github.com/avinashims/nodeapi.git ecommerce-qa
cd /var/www/ecommerce-qa
```

### 4.3 Create QA .env

```bash
cp .env.qa.example .env
nano .env
```

Key values:

```env
APP_PORT=8080
IMAGE_TAG=qa
CLIENT_URL=http://YOUR_QA_IP:8080
MYSQL_DATABASE=ecommerce_db_qa
GITHUB_REPOSITORY=avinashims/nodeapi
```

### 4.4 Disable system nginx (if installed)

```bash
systemctl stop nginx
systemctl disable nginx
```

### 4.5 Login GHCR

```bash
echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u avinashims --password-stdin
```

### 4.6 Add SSH public key

Same as production — add `do_deploy.pub` to `~/.ssh/authorized_keys`.

### 4.7 Open firewall port 8080

```bash
ufw allow 8080/tcp
ufw allow 80/tcp
ufw allow OpenSSH
ufw enable
```

DigitalOcean firewall: allow **8080** for QA.

### 4.8 First QA deploy

Push code from PC (triggers QA auto deploy):

```powershell
git push origin ecomm
```

Or manually on server after first GitHub build:

```bash
cd /var/www/ecommerce-qa
docker compose -f docker-compose.qa.yml pull
docker compose -f docker-compose.qa.yml up -d
curl http://localhost:8080/api/health
```

Test in browser: `http://YOUR_QA_IP:8080`

---

## 5. Production server setup

Your existing production server (`/var/www/ecommerce`) stays the same.

Ensure `.env` has:

```env
APP_PORT=80
IMAGE_TAG=latest
CLIENT_URL=http://YOUR_PROD_IP
GITHUB_REPOSITORY=avinashims/nodeapi
```

Production is **NOT** auto-deployed anymore — only via approval (Step 7).

---

## 6. Daily workflow

### Step 1 — Develop and push (PC)

```powershell
cd "C:\nodeapplication inprisma"
git add .
git commit -m "Your feature"
git push origin ecomm
```

### Step 2 — QA deploys automatically

GitHub Actions runs:

| Job | Action |
|-----|--------|
| build-api | ✅ |
| build-web | ✅ |
| deploy-qa | ✅ Auto |

### Step 3 — Test on QA

```
http://YOUR_QA_IP:8080
http://YOUR_QA_IP:8080/api/health
http://YOUR_QA_IP:8080/api/products
```

Test all features. Fix bugs → push again → QA updates automatically.

### Step 4 — Promote to production (only when QA is OK)

See [Section 7](#7-promote-qa--production).

---

## 7. Promote QA → Production

Only after QA testing passes.

### Step 1 — Run promote workflow

1. GitHub → **Actions** → **Build and Deploy**
2. **Run workflow**
3. Branch: `ecomm`
4. Check ✅ **Promote QA-tested build to Production**
5. Image tag: `qa` (default — uses what QA is running)
6. **Run workflow**

### Step 2 — Approve deployment

GitHub shows **"Review pending deployments"**:

1. Click **Review deployments**
2. Select **production** environment
3. Click **Approve and deploy**

### Step 3 — Verify production

```
http://YOUR_PROD_IP/api/health
```

Actions shows **deploy-production** ✅ green.

---

## What promote does

1. Pulls `api:qa` and `web:qa` from GHCR
2. Retags them as `:latest` and pushes to GHCR
3. SSH to production server
4. `docker compose -f docker-compose.prod.yml pull && up -d`

Production runs the **same build** that was tested on QA.

---

## 8. Files reference

| File | Purpose |
|------|---------|
| `docker-compose.qa.yml` | QA stack (port 8080, `:qa` images) |
| `docker-compose.prod.yml` | Production stack (port 80, `:latest` images) |
| `.env.qa.example` | QA environment template |
| `.env.docker.example` | Production environment template |
| `.github/workflows/deploy.yml` | Build + QA auto + prod promote |

---

## 9. Troubleshooting

| Problem | Solution |
|---------|----------|
| QA not updating | Check `QA_HOST` secret; deploy-qa job logs |
| Production not deploying | Must run workflow + approve in GitHub |
| QA on port 8080 not loading | `ufw allow 8080`; check web container Up |
| Same server both envs | Use different paths + ports 8080 vs 80 |
| `QA_HOST` secret missing | Add in GitHub Secrets |
| Approval not showing | Create `production` environment with reviewers |
| Prod has old code | Run promote workflow with tag `qa` |

---

## Quick checklist

### GitHub
- [ ] Environment `qa` created
- [ ] Environment `production` with required reviewers
- [ ] Secrets: `QA_HOST`, `PROD_HOST`, `DO_USER`, `DO_SSH_KEY`, `GHCR_TOKEN`

### QA server
- [ ] `/var/www/ecommerce-qa` cloned
- [ ] `.env` from `.env.qa.example`
- [ ] Port 8080 open
- [ ] `http://QA_IP:8080` works

### Production server
- [ ] `/var/www/ecommerce` configured
- [ ] Port 80 open
- [ ] Promote workflow tested with approval

### Process
- [ ] Push → QA auto deploys
- [ ] Test QA
- [ ] Approve → Production deploys

---

## Summary

| Action | Who | When |
|--------|-----|------|
| Push to `ecomm` | Developer | Anytime |
| Deploy QA | Automatic | Every push |
| Test QA | Developer/QA team | Before prod |
| Promote to Production | Developer + **Approver** | After QA pass |

**Rule:** Never skip QA. Production only after approval.
