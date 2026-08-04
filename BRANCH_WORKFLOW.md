# Branch Workflow — ecomm (QA) → main (Production)

| Branch | Environment | URL | Deploy |
|--------|-------------|-----|--------|
| **`ecomm`** | QA | `http://165.22.209.200:8080` | Automatic on push |
| **`main`** | Production | `http://165.22.209.200` | Push + **approval** |

---

## Daily process

### Step 1 — Develop and push to QA (`ecomm`)

```powershell
cd "C:\nodeapplication inprisma"
git checkout ecomm
git pull origin ecomm

# edit code...

git add .
git commit -m "Your feature"
git push origin ecomm
```

**GitHub Actions runs:**
- build-api + build-web → tags `:qa`
- deploy-qa → QA server (port 8080)

**Test:** `http://165.22.209.200:8080`

---

### Step 2 — Merge to Production (`main`) after QA pass

When QA testing is OK:

```powershell
git checkout main
git pull origin main
git merge ecomm -m "Release: merge QA to production"
git push origin main
```

**GitHub Actions runs:**
- build-api + build-web → tags `:latest`
- deploy-production → **waits for your approval** → Production (port 80)

---

### Step 3 — Approve production deploy

1. GitHub → **Actions** → latest **main** workflow run
2. Yellow banner: **Review pending deployments**
3. **Review deployments** → **Approve and deploy**

**Test:** `http://165.22.209.200`

---

## Visual flow

```
Edit code on ecomm
      ↓
git push origin ecomm
      ↓
QA auto deploy (:8080)  ← test here
      ↓
QA OK?
      ↓
git checkout main
git merge ecomm
git push origin main
      ↓
Approve in GitHub
      ↓
Production live (:80)
```

---

## Server folders

| Environment | Branch | Server path |
|-------------|--------|-------------|
| QA | `ecomm` | `/var/www/ecommerce-qa` |
| Production | `main` | `/var/www/ecommerce` |

---

## GitHub setup required

| Item | Value |
|------|--------|
| Environment `qa` | No approval |
| Environment `production` | Required reviewers |
| Secret `QA_HOST` | `165.22.209.200` |
| Secret `PROD_HOST` | `165.22.209.200` |
| Default branch | `main` |

---

## Quick commands

```powershell
# QA deploy
git checkout ecomm
git push origin ecomm

# Production deploy
git checkout main
git merge ecomm
git push origin main
# → then Approve in GitHub Actions
```

---

## Summary

| Action | Branch | Result |
|--------|--------|--------|
| Push | `ecomm` | QA updates automatically |
| Merge + push | `main` | Production after approval |

**Rule:** Never push directly to `main` without testing on `ecomm` first.
