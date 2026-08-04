# Complete Server Setup → CI/CD → Deploy

**End-to-end guide:** empty Ubuntu server → install everything → CI/CD → live website.

| Item | Value |
|------|--------|
| **Project** | Ecommerce (Node.js + React + MySQL + Redis) |
| **Repo** | `https://github.com/avinashims/nodeapi` |
| **Branch** | `ecomm` |
| **Server path** | `/var/www/ecommerce` |
| **Example IP** | `165.22.209.200` |

**Related docs:**
- [CI_CD_COMPLETE_GUIDE.md](./CI_CD_COMPLETE_GUIDE.md) — daily deploy workflow
- [LOCAL_TO_LIVE.md](./LOCAL_TO_LIVE.md) — manual build method

---

## Table of contents

### Part A — Before server (PC + GitHub)
1. [Prerequisites](#part-a--before-server)
2. [Create GitHub repo & push code](#step-a2--push-code-to-github)
3. [GitHub CI/CD secrets setup](#step-a3--github-cicd-setup)

### Part B — Create cloud server
4. [Create DigitalOcean droplet](#step-b1--create-digitalocean-droplet)
5. [Connect to server from Windows](#step-b2--connect-from-windows)

### Part C — Install everything on server
6. [Update Ubuntu](#step-c1--update-ubuntu)
7. [Install Git](#step-c2--install-git)
8. [Install Docker & Docker Compose](#step-c3--install-docker)
9. [About Nginx (important)](#step-c4--about-nginx)
10. [Stop conflicting services](#step-c5--stop-conflicting-services)
11. [Configure firewall](#step-c6--configure-firewall)

### Part D — Deploy application on server
12. [Clone project from GitHub](#step-d1--clone-project)
13. [Create .env file](#step-d2--create-env-file)
14. [Add SSH key for CI/CD deploy](#step-d3--ssh-key-for-cicd)
15. [Login to GitHub Container Registry](#step-d4--login-ghcr)
16. [First deploy](#step-d5--first-deploy)
17. [Verify website works](#step-d6--verify)

### Part E — CI/CD auto-deploy
18. [How CI/CD works](#part-e--cicd-auto-deploy)
19. [Daily workflow after setup](#step-e2--daily-workflow)

### Part F — Optional
20. [MySQL Workbench remote access](#part-f--optional-mysql-workbench)
21. [Useful commands](#part-g--useful-commands)
22. [Troubleshooting](#part-h--troubleshooting)
23. [Master checklist](#master-checklist)

---

# PART A — Before server

## Step A1 — Prerequisites

On your **Windows PC** you need:

- Git installed
- Project code at `C:\nodeapplication inprisma`
- GitHub account
- DigitalOcean account

Project files already in repo:

| File | Purpose |
|------|---------|
| `Dockerfile` | API image |
| `ecommerce-frontend/Dockerfile` | Frontend + Nginx image |
| `docker-compose.prod.yml` | Live server (pull from GHCR) |
| `docker-compose.build.yml` | Live server (build on server) |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `ecommerce-frontend/docker/nginx.conf` | Nginx inside Docker |

---

## Step A2 — Push code to GitHub

On your PC:

```powershell
cd "C:\nodeapplication inprisma"
git init
git remote add origin https://github.com/avinashims/nodeapi.git
git checkout -b ecomm
git add .
git commit -m "Initial commit"
git push -u origin ecomm
```

> **Never commit:** `.env`, passwords, GitHub tokens (`ghp_...`), SSH private keys, `login.txt`

---

## Step A3 — GitHub CI/CD setup

Do this **on GitHub website** before or after server setup.

### A3.1 Enable Actions permissions

1. Repo → **Settings** → **Actions** → **General**
2. **Workflow permissions** → **Read and write permissions**
3. **Save**

### A3.2 Create SSH key on PC (for deploy)

```cmd
ssh-keygen -t ed25519 -C "github-actions-deploy" -f %USERPROFILE%\.ssh\do_deploy
```

Press **Enter** twice (empty passphrase).

View keys:

```cmd
type %USERPROFILE%\.ssh\do_deploy.pub
type %USERPROFILE%\.ssh\do_deploy
```

- **`.pub`** → goes on **server** (Step D3)
- **`do_deploy`** (private) → goes in **GitHub Secret** (below)

### A3.3 Create GitHub token (GHCR_TOKEN)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Scopes: `read:packages`, `write:packages`
4. Copy token (`ghp_...`) — save in password manager

### A3.4 Add GitHub Secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret name | Value |
|-------------|--------|
| `DO_HOST` | Your droplet IP (e.g. `165.22.209.200`) |
| `DO_USER` | `root` |
| `DO_SSH_KEY` | Full private key from `type %USERPROFILE%\.ssh\do_deploy` |
| `GHCR_TOKEN` | GitHub token `ghp_...` |

---

# PART B — Create cloud server

## Step B1 — Create DigitalOcean droplet

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. **Create** → **Droplets**
3. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic — **2 GB RAM** / 1 vCPU (`s-1vcpu-2gb`)
   - **Region:** closest to users (e.g. Bangalore)
   - **Authentication:** SSH key (recommended) or password
4. **Create Droplet**
5. Note the **IP address** (e.g. `165.22.209.200`)

### DigitalOcean Cloud Firewall (recommended)

**Networking** → **Firewalls** → create or edit:

| Rule | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP (or All for testing) |
| HTTP | 80 | All IPv4 |
| HTTPS | 443 | All IPv4 |
| MySQL | 3306 | Your IP only (optional, for Workbench) |

Attach firewall to your droplet.

---

## Step B2 — Connect from Windows

```cmd
ssh -i %USERPROFILE%\.ssh\do_deploy root@165.22.209.200
```

Or if using default key:

```cmd
ssh root@165.22.209.200
```

First time: type `yes` when asked about fingerprint.

You should see:

```
root@ubuntu-s-1vcpu-2gb-blr1:~#
```

---

# PART C — Install everything on server

Run all commands **on the server** (after SSH login).

## Step C1 — Update Ubuntu

```bash
apt update && apt upgrade -y
```

---

## Step C2 — Install Git

```bash
apt install -y git
git --version
```

Expected: `git version 2.x.x`

---

## Step C3 — Install Docker

```bash
apt install -y ca-certificates curl

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Verify:

```bash
docker --version
docker compose version
```

Expected:

```
Docker version 2x.x.x
Docker Compose version v2.x.x
```

---

## Step C4 — About Nginx

**You do NOT install Nginx separately on the server.**

Nginx runs **inside the Docker `web` container** (from `ecommerce-frontend/Dockerfile`).

```
Browser → port 80 → Docker web container (nginx) → /api → api container
```

If Ubuntu **system Nginx** is installed, it **blocks port 80** and breaks Docker.

Check if installed:

```bash
nginx -v
systemctl status nginx
```

If active → disable in Step C5.

---

## Step C5 — Stop conflicting services

### Stop system Nginx (required)

```bash
systemctl stop nginx
systemctl disable nginx
```

### Stop system MySQL (if installed — conflicts with Docker port 3306)

```bash
systemctl stop mysql
systemctl disable mysql
```

Verify port 80 is free:

```bash
ss -tlnp | grep :80
```

(No output = good)

---

## Step C6 — Configure firewall

### Ubuntu UFW (on server)

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3306/tcp
ufw enable
ufw status
```

> Restrict MySQL port 3306 to your home IP in production:
> `ufw allow from YOUR_IP to any port 3306`

---

# PART D — Deploy application on server

## Step D1 — Clone project

```bash
mkdir -p /var/www
cd /var/www
git clone -b ecomm https://github.com/avinashims/nodeapi.git ecommerce
cd /var/www/ecommerce
ls -la
```

You should see: `Dockerfile`, `docker-compose.prod.yml`, `src/`, `ecommerce-frontend/`, etc.

If folder exists and is broken:

```bash
rm -rf /var/www/ecommerce
git clone -b ecomm https://github.com/avinashims/nodeapi.git ecommerce
```

---

## Step D2 — Create .env file

```bash
cd /var/www/ecommerce
cp .env.docker.example .env
nano .env
```

Edit with your real values:

```env
APP_PORT=80

MYSQL_ROOT_PASSWORD=StrongRootPass123!
MYSQL_DATABASE=ecommerce_db
MYSQL_USER=ecom_user
MYSQL_PASSWORD=StrongDbPass123!

NODE_ENV=production
PORT=3000

JWT_SECRET=your-long-random-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_DAYS=7

CLIENT_URL=http://165.22.209.200

REDIS_URL=redis://redis:6379
REDIS_DEFAULT_TTL=300

RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
ADMIN_REGISTRATION_SECRET=change-this-admin-secret

GITHUB_REPOSITORY=avinashims/nodeapi
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

> **Never commit `.env` to Git.**

---

## Step D3 — SSH key for CI/CD

GitHub Actions needs to SSH into this server to deploy.

Add your **public** key (`do_deploy.pub` from PC):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Paste the line from PC:

```cmd
type %USERPROFILE%\.ssh\do_deploy.pub
```

Save. Then:

```bash
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

Test from PC:

```cmd
ssh -i %USERPROFILE%\.ssh\do_deploy root@165.22.209.200
```

---

## Step D4 — Login GHCR

GitHub Container Registry stores your Docker images.

```bash
echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u avinashims --password-stdin
```

Replace `YOUR_GHCR_TOKEN` with your `ghp_...` token.

Expected: `Login Succeeded`

---

## Step D5 — First deploy

### Option 1 — CI/CD (recommended)

**First**, trigger a build on GitHub:

```powershell
# On PC — push code to trigger Actions
git push origin ecomm
```

Wait for GitHub → **Actions** → **build-api** + **build-web** green ✅

Then on **server**:

```bash
cd /var/www/ecommerce
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

### Option 2 — Build on server (if GHCR not ready)

```bash
cd /var/www/ecommerce
docker compose -f docker-compose.build.yml up -d --build
docker compose -f docker-compose.build.yml ps
```

Expected output:

```
ecommerce-web-1     Up   0.0.0.0:80->80/tcp
ecommerce-api-1     Up (healthy)
ecommerce-mysql-1   Up (healthy)   0.0.0.0:3306->3306/tcp
ecommerce-redis-1   Up
```

First start may take **5–15 minutes** (downloads images, runs migrations).

---

## Step D6 — Verify

On server:

```bash
curl http://localhost/api/health
curl "http://localhost/api/products?page=1&limit=5"
```

On PC browser:

```
http://165.22.209.200/
http://165.22.209.200/api/health
```

Create admin user (optional):

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

---

# PART E — CI/CD auto-deploy

## How it works

After setup, every `git push` triggers:

```
PC: git push origin ecomm
        ↓
GitHub Actions:
  1. build-api  → push ghcr.io/avinashims/nodeapi/api:latest
  2. build-web  → push ghcr.io/avinashims/nodeapi/web:latest
  3. deploy     → SSH to server → pull → up -d
        ↓
Live site updated (no manual SSH needed)
```

Workflow file: `.github/workflows/deploy.yml`

---

## Step E2 — Daily workflow

### On PC (every code change)

```powershell
cd "C:\nodeapplication inprisma"
git add .
git commit -m "Describe your change"
git push origin ecomm
```

### Wait for GitHub Actions

Open: `https://github.com/avinashims/nodeapi/actions`

All 3 jobs must be green:

| Job | Status |
|-----|--------|
| build-api | ✅ |
| build-web | ✅ |
| deploy | ✅ |

### Test live site

```
http://165.22.209.200
```

**You do not need to SSH to the server for normal deploys.**

---

## Make GHCR packages public (recommended)

After first successful build:

1. GitHub Profile → **Packages**
2. `nodeapi/api` → **Package settings** → **Change visibility** → **Public**
3. Repeat for `nodeapi/web`

---

# PART F — Optional: MySQL Workbench

Connect from your PC to live database.

### Server — ensure MySQL port is mapped

In `docker-compose.prod.yml` under `mysql:`:

```yaml
ports:
  - "3306:3306"
```

Restart:

```bash
docker compose -f docker-compose.prod.yml up -d mysql
```

### MySQL Workbench settings

| Field | Value |
|-------|--------|
| Connection Method | Standard (TCP/IP) |
| Hostname | `165.22.209.200` |
| Port | `3306` |
| Username | `ecom_user` |
| Password | from server `.env` |
| Default Schema | `ecommerce_db` |

### Connect via server SSH (alternative)

```bash
docker compose -f docker-compose.prod.yml exec mysql mysql -u ecom_user -p ecommerce_db
```

---

# PART G — Useful commands

All run from `/var/www/ecommerce` on server.

```bash
cd /var/www/ecommerce

# Container status
docker compose -f docker-compose.prod.yml ps

# Logs (live)
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Manual pull + deploy (if CI/CD failed)
git pull origin ecomm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Stop all
docker compose -f docker-compose.prod.yml down

# Start all
docker compose -f docker-compose.prod.yml up -d

# Health checks
curl http://localhost/api/health
curl "http://localhost/api/products?page=1&limit=5"

# Enter API container
docker compose -f docker-compose.prod.yml exec api sh

# MySQL shell
docker compose -f docker-compose.prod.yml exec mysql mysql -u ecom_user -p ecommerce_db
```

---

# PART H — Troubleshooting

| Problem | Solution |
|---------|----------|
| `Permission denied (publickey)` SSH | Add public key to `~/.ssh/authorized_keys` |
| Deploy job: `ssh: no key found` | Fix `DO_SSH_KEY` secret — paste full private key |
| Push rejected (rule violations) | Remove secrets from commit; never commit `.env`, tokens |
| Port 80 connection refused | `docker compose ps` — web must be Up; disable system nginx |
| web container restarting | Ensure `resolver 127.0.0.11` in `nginx.conf`; rebuild web |
| `Route not found` on live | Wait for deploy job green; old image still running |
| MySQL port 3306 in use | `systemctl stop mysql && disable mysql` |
| `pull access denied` | `docker login ghcr.io` with valid token |
| `manifest unknown` | Wait for build-api/build-web green on GitHub |
| Code pushed but site unchanged | Deploy job failed — check Actions logs |
| GitHub Actions red | Enable Read and write workflow permissions |

---

# Master checklist

## PC setup
- [ ] Code pushed to GitHub branch `ecomm`
- [ ] SSH key pair created (`do_deploy` / `do_deploy.pub`)
- [ ] GitHub Secrets: `DO_HOST`, `DO_USER`, `DO_SSH_KEY`, `GHCR_TOKEN`
- [ ] Actions permissions: Read and write

## DigitalOcean
- [ ] Droplet created (Ubuntu 22.04, 2 GB RAM)
- [ ] Firewall: ports 22, 80, 443 (3306 optional)
- [ ] IP address noted

## Server install
- [ ] `apt update && upgrade`
- [ ] Git installed
- [ ] Docker + Docker Compose installed
- [ ] System nginx **stopped & disabled**
- [ ] System mysql **stopped & disabled** (if was installed)
- [ ] UFW firewall configured

## Server deploy
- [ ] Repo cloned to `/var/www/ecommerce`
- [ ] `.env` created and configured
- [ ] `GITHUB_REPOSITORY=avinashims/nodeapi` in `.env`
- [ ] Public SSH key in `authorized_keys`
- [ ] `docker login ghcr.io` succeeded
- [ ] `docker compose -f docker-compose.prod.yml up -d` works
- [ ] `curl http://localhost/api/health` returns JSON
- [ ] Browser opens `http://YOUR_IP`

## CI/CD
- [ ] Push triggers build-api + build-web + deploy (all green)
- [ ] GHCR packages `nodeapi/api` and `nodeapi/web` exist
- [ ] Auto-deploy updates live site without manual SSH

## Daily (after setup)
- [ ] Edit code on PC
- [ ] `git push origin ecomm`
- [ ] Wait for 3 green Actions jobs
- [ ] Test `http://YOUR_IP`

---

# Quick reference — order of setup

```
1.  Push code to GitHub (PC)
2.  Create DigitalOcean droplet
3.  SSH into server
4.  apt update, install git, install docker
5.  Stop system nginx + mysql
6.  Configure firewall
7.  git clone project to /var/www/ecommerce
8.  Create .env file
9.  Add SSH public key for CI/CD
10. docker login ghcr.io
11. Set GitHub Secrets (PC/GitHub website)
12. git push → wait for Actions build
13. docker compose -f docker-compose.prod.yml pull && up -d
14. Test website
15. Daily: git push only → auto deploy
```

---

*Last updated: branch `ecomm` | Ubuntu 22.04 | Docker Compose v2 | Auto-deploy enabled*
