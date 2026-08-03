# CI/CD Setup — Deploy with `docker-compose.prod.yml`

Step-by-step guide to deploy using GitHub Actions + GHCR + `docker-compose.prod.yml`.

---

## How it works

```
PC: git push origin ecomm
        ↓
GitHub Actions: build-api + build-web → push to GHCR
        ↓
Server: pull images → docker-compose.prod.yml up -d
        ↓
Live site updated
```

**Images stored at:**
- `ghcr.io/avinashims/nodeapi/api:latest`
- `ghcr.io/avinashims/nodeapi/web:latest`

---

## PART 1 — One-time GitHub setup

### 1.1 Enable workflow permissions

1. Open `https://github.com/avinashims/nodeapi`
2. **Settings** → **Actions** → **General**
3. **Workflow permissions** → select **Read and write permissions**
4. **Save**

### 1.2 Add GitHub secrets

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|--------|
| `DO_HOST` | `165.22.209.200` (your droplet IP) |
| `DO_USER` | `root` |
| `DO_SSH_KEY` | Full private SSH key (see below) |
| `GHCR_TOKEN` | GitHub Personal Access Token (see below) |

#### Create deploy SSH key (Windows PowerShell)

```powershell
ssh-keygen -t ed25519 -C "github-actions" -f $env:USERPROFILE\.ssh\do_deploy
```

1. Copy **public** key to DigitalOcean droplet SSH keys:
   ```powershell
   Get-Content $env:USERPROFILE\.ssh\do_deploy.pub
   ```
2. Copy **private** key to GitHub secret `DO_SSH_KEY`:
   ```powershell
   Get-Content $env:USERPROFILE\.ssh\do_deploy
   ```

#### Create GHCR token

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Scopes: `read:packages`, `write:packages`
4. Copy token → save as secret `GHCR_TOKEN`

### 1.3 Make GHCR packages public (recommended)

After first successful build:

1. GitHub Profile → **Packages**
2. Open `nodeapi/api` → **Package settings** → **Change visibility** → **Public**
3. Repeat for `nodeapi/web`

*(Or keep private and always use `GHCR_TOKEN` to login on server.)*

---

## PART 2 — One-time server setup

SSH into server:

```bash
ssh root@165.22.209.200
cd /var/www/ecommerce
```

### 2.1 Ensure `.env` has GITHUB_REPOSITORY

```bash
grep GITHUB_REPOSITORY .env
```

Must show:

```env
GITHUB_REPOSITORY=avinashims/nodeapi
```

If missing:

```bash
echo "GITHUB_REPOSITORY=avinashims/nodeapi" >> .env
```

### 2.2 Login to GHCR on server (once)

```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Use the same PAT as `GHCR_TOKEN` (needs `read:packages`).

### 2.3 Stop old build-based containers (first time only)

Switch from `docker-compose.build.yml` to `docker-compose.prod.yml`:

```bash
cd /var/www/ecommerce
docker compose -f docker-compose.build.yml down
# mysql/redis data volumes are kept (same volume names)
```

### 2.4 First deploy with prod.yml

**Wait for green GitHub Actions build first**, then:

```bash
git pull origin ecomm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Expected:

```
ecommerce-web-1     Up   0.0.0.0:80->80/tcp
ecommerce-api-1     Up (healthy)
ecommerce-mysql-1   Up (healthy)
ecommerce-redis-1   Up
```

### 2.5 Test

```bash
curl http://localhost/api/health
curl http://localhost/api/products?page=1&limit=5
```

---

## PART 3 — Daily deploy workflow

### Step 1 — Push from PC

```powershell
cd "C:\nodeapplication inprisma"
git add .
git commit -m "Your change"
git push origin ecomm
```

### Step 2 — Wait for GitHub Actions

1. GitHub → **Actions**
2. Wait for **build-api** and **build-web** to turn **green** ✅

### Step 3 — Deploy to server

**Option A — Manual from GitHub (recommended)**

1. **Actions** → **Build and Deploy** → **Run workflow**
2. Branch: `ecomm`
3. Check ✅ **Deploy to DigitalOcean server**
4. **Run workflow**

**Option B — SSH to server manually**

```bash
ssh root@165.22.209.200
cd /var/www/ecommerce
git pull origin ecomm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl http://localhost/api/health
```

**Pull only API (faster if only API changed):**

```bash
docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml up -d api
```

**Pull only Web:**

```bash
docker compose -f docker-compose.prod.yml pull web
docker compose -f docker-compose.prod.yml up -d web
```

---

## PART 4 — Useful commands

```bash
cd /var/www/ecommerce

# Status
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Restart without new image (env change only)
docker compose -f docker-compose.prod.yml up -d api

# Stop all
docker compose -f docker-compose.prod.yml down
```

---

## PART 5 — Troubleshooting

| Problem | Solution |
|---------|----------|
| `Error response from daemon: pull access denied` | Run `docker login ghcr.io` on server; check `GHCR_TOKEN` |
| `manifest unknown` / image not found | Wait for green Actions build; check packages on GHCR |
| `build-api` fails on GitHub | Enable Read and write workflow permissions |
| Deploy job fails SSH | Check `DO_HOST`, `DO_USER`, `DO_SSH_KEY` secrets |
| Old code still running | Run `docker compose -f docker-compose.prod.yml pull` then `up -d` |
| web not starting | Check `docker compose logs web`; disable system nginx |
| Route not found | Ensure Actions build is green, then pull latest images |

---

## PART 6 — Comparison

| | `docker-compose.build.yml` | `docker-compose.prod.yml` |
|--|------------------------------|---------------------------|
| Build location | Server | GitHub Actions |
| Deploy command | `up -d --build api` | `pull` + `up -d` |
| Speed on server | Slow (build) | Fast (download) |
| CI/CD | Optional | Required |

---

## Checklist

### GitHub
- [ ] Workflow permissions: Read and write
- [ ] Secrets: `DO_HOST`, `DO_USER`, `DO_SSH_KEY`, `GHCR_TOKEN`
- [ ] Push to `ecomm` → build-api + build-web green
- [ ] Packages visible on GHCR

### Server
- [ ] `.env` has `GITHUB_REPOSITORY=avinashims/nodeapi`
- [ ] `docker login ghcr.io` done
- [ ] `docker compose -f docker-compose.prod.yml up -d` works
- [ ] `curl http://localhost/api/health` returns JSON

### Daily
- [ ] `git push origin ecomm`
- [ ] Actions green
- [ ] Run workflow with Deploy checked OR manual `pull` + `up -d`
