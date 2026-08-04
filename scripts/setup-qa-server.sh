#!/bin/bash
# One-time QA environment setup on Ubuntu server
# Run as root: bash scripts/setup-qa-server.sh

set -e

QA_DIR="/var/www/ecommerce-qa"
REPO="https://github.com/avinashims/nodeapi.git"
BRANCH="ecomm"
QA_PORT="8080"

echo "=== QA Environment Setup ==="

# 1. Check Docker
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker not installed. Run SERVER_SETUP_COMPLETE.md Part C first."
  exit 1
fi

# 2. Stop system nginx if blocking ports
if systemctl is-active --quiet nginx 2>/dev/null; then
  echo "Stopping system nginx..."
  systemctl stop nginx
  systemctl disable nginx
fi

# 3. Clone or update repo
if [ -d "$QA_DIR/.git" ]; then
  echo "QA folder exists — pulling latest..."
  cd "$QA_DIR"
  git pull origin "$BRANCH"
else
  echo "Cloning repo to $QA_DIR..."
  mkdir -p /var/www
  git clone -b "$BRANCH" "$REPO" "$QA_DIR"
  cd "$QA_DIR"
fi

# 4. Create .env if missing
if [ ! -f .env ]; then
  echo "Creating .env from .env.qa.example..."
  cp .env.qa.example .env
  echo ""
  echo "IMPORTANT: Edit .env with your QA settings:"
  echo "  nano $QA_DIR/.env"
  echo ""
  echo "Set at minimum:"
  echo "  CLIENT_URL=http://YOUR_SERVER_IP:$QA_PORT"
  echo "  MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, JWT_SECRET"
  echo ""
else
  echo ".env already exists — skipping"
fi

# 5. Firewall
if command -v ufw &> /dev/null; then
  ufw allow "$QA_PORT/tcp" 2>/dev/null || true
  ufw allow OpenSSH 2>/dev/null || true
  echo "Firewall: port $QA_PORT allowed"
fi

# 6. GHCR login reminder
if [ ! -f /root/.docker/config.json ] || ! grep -q ghcr.io /root/.docker/config.json 2>/dev/null; then
  echo ""
  echo "Login to GHCR (required once):"
  echo '  echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u avinashims --password-stdin'
  echo ""
fi

# 7. First deploy (if images exist on GHCR)
echo ""
read -p "Run first QA deploy now? (y/n): " DEPLOY_NOW
if [ "$DEPLOY_NOW" = "y" ] || [ "$DEPLOY_NOW" = "Y" ]; then
  export IMAGE_TAG=qa
  docker compose -f docker-compose.qa.yml pull || echo "Pull failed — push code to GitHub first to build :qa images"
  docker compose -f docker-compose.qa.yml up -d --remove-orphans
  docker compose -f docker-compose.qa.yml ps
  echo ""
  echo "Test: curl http://localhost:$QA_PORT/api/health"
fi

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "=== QA Setup Complete ==="
echo "QA folder:  $QA_DIR"
echo "QA URL:     http://${SERVER_IP:-YOUR_IP}:$QA_PORT"
echo ""
echo "Next steps:"
echo "  1. Edit .env: nano $QA_DIR/.env"
echo "  2. Add GitHub secret QA_HOST = your server IP"
echo "  3. GitHub → Settings → Environments → create 'qa'"
echo "  4. git push origin ecomm → QA auto deploys"
echo ""
