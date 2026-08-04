# QA Environment — Quick Setup Guide

Set up QA on your server so every `git push` deploys to **port 8080** for testing before production.

| | QA | Production |
|--|-----|------------|
| **URL** | `http://165.22.209.200:8080` | `http://165.22.209.200` |
| **Folder** | `/var/www/ecommerce-qa` | `/var/www/ecommerce` |
| **Port** | 8080 | 80 |
| **Deploy** | Automatic on push | After approval |

Full guide: [QA_PRODUCTION_SETUP.md](./QA_PRODUCTION_SETUP.md)

---

## PART 1 — GitHub setup (do first)

### 1.1 Create `qa` environment

1. GitHub repo → **Settings** → **Environments**
2. **New environment** → name: `qa`
3. **Save** (no approval needed for QA)

### 1.2 Create `production` environment (for later)

1. **New environment** → name: `production`
2. ✅ **Required reviewers** → add yourself
3. **Save**

### 1.3 Add GitHub Secrets

**Settings** → **Secrets** → **Actions**

| Secret | Value (your setup) |
|--------|---------------------|
| `QA_HOST` | `165.22.209.200` |
| `PROD_HOST` | `165.22.209.200` |
| `DO_USER` | `root` |
| `DO_SSH_KEY` | Your private SSH key |
| `GHCR_TOKEN` | Your `ghp_...` token |

---

## PART 2 — Server setup (SSH)

Connect to server:

```cmd
ssh root@165.22.209.200
```

### Option A — Automatic script

```bash
cd /var/www/ecommerce
git pull origin ecomm
bash scripts/setup-qa-server.sh
```

### Option B — Manual steps

```bash
# 1. Clone QA folder
mkdir -p /var/www
cd /var/www
git clone -b ecomm https://github.com/avinashims/nodeapi.git ecommerce-qa
cd /var/www/ecommerce-qa

# 2. Create .env
cp .env.qa.example .env
nano .env
```

Edit `.env` — minimum changes:

```env
APP_PORT=8080
IMAGE_TAG=qa
CLIENT_URL=http://165.22.209.200:8080

MYSQL_ROOT_PASSWORD=YourQaRootPass123!
MYSQL_DATABASE=ecommerce_db_qa
MYSQL_USER=ecom_user_qa
MYSQL_PASSWORD=YourQaDbPass123!

JWT_SECRET=your-qa-jwt-secret-min-32-chars
ADMIN_REGISTRATION_SECRET=your-qa-admin-secret

GITHUB_REPOSITORY=avinashims/nodeapi
```

```bash
# 3. Open firewall port 8080
ufw allow 8080/tcp
ufw status

# 4. Login GHCR (if not done)
echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u avinashims --password-stdin

# 5. First QA deploy
export IMAGE_TAG=qa
docker compose -f docker-compose.qa.yml pull
docker compose -f docker-compose.qa.yml up -d
docker compose -f docker-compose.qa.yml ps
```

---

## PART 3 — Verify QA works

On server:

```bash
curl http://localhost:8080/api/health
curl "http://localhost:8080/api/products?page=1&limit=5"
```

Browser (your PC):

```
http://165.22.209.200:8080
http://165.22.209.200:8080/api/health
```

Expected containers:

```
ecommerce-qa-web-1     Up   0.0.0.0:8080->80/tcp
ecommerce-qa-api-1     Up (healthy)
ecommerce-qa-mysql-1   Up (healthy)
ecommerce-qa-redis-1   Up
```

---

## PART 4 — Push from PC (auto deploy QA)

```powershell
cd "C:\nodeapplication inprisma"
git add .
git commit -m "Setup QA environment"
git push origin ecomm
```

GitHub Actions should show:

| Job | Status |
|-----|--------|
| build-api | ✅ |
| build-web | ✅ |
| deploy-qa | ✅ |

Test: `http://165.22.209.200:8080`

---

## PART 5 — Promote to production (after QA test)

1. Test everything on QA port 8080
2. GitHub → **Actions** → **Build and Deploy** → **Run workflow**
3. Branch: `ecomm`
4. Check ✅ **Promote QA-tested build to Production**
5. **Run workflow**
6. Click **Review deployments** → **Approve** production
7. Test: `http://165.22.209.200`

---

## DigitalOcean firewall

Add inbound rule:

| Type | Port | Source |
|------|------|--------|
| Custom TCP | **8080** | All IPv4 (or your IP) |

---

## Useful QA commands

```bash
cd /var/www/ecommerce-qa

# Status
docker compose -f docker-compose.qa.yml ps

# Logs
docker compose -f docker-compose.qa.yml logs -f api

# Restart QA
docker compose -f docker-compose.qa.yml up -d

# Stop QA (production keeps running)
docker compose -f docker-compose.qa.yml down

# MySQL QA shell
docker compose -f docker-compose.qa.yml exec mysql mysql -u ecom_user_qa -p ecommerce_db_qa
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 8080 not loading | `ufw allow 8080`; DO firewall allow 8080 |
| deploy-qa fails | Add `QA_HOST` secret in GitHub |
| `pull access denied` | `docker login ghcr.io` on server |
| QA and prod conflict | Different folders + ports (8080 vs 80) — OK on same server |
| `manifest unknown` | Push code first; wait for build-api/build-web green |

---

## Checklist

- [ ] GitHub environment `qa` created
- [ ] GitHub secret `QA_HOST=165.22.209.200`
- [ ] `/var/www/ecommerce-qa` cloned
- [ ] `.env` configured from `.env.qa.example`
- [ ] Port 8080 open (ufw + DigitalOcean)
- [ ] `curl http://localhost:8080/api/health` works
- [ ] `git push` → deploy-qa green
- [ ] Browser: `http://165.22.209.200:8080` works

---

## Summary

```
git push  →  QA auto deploys (port 8080)
Test QA   →  approve  →  Production (port 80)
```

QA uses **separate database** (`ecommerce_db_qa`) — safe to test without affecting live users.
