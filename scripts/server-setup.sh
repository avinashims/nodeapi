#!/bin/bash
# Run once on a fresh Ubuntu DigitalOcean droplet (as root)
set -e

apt update && apt upgrade -y
apt install -y ca-certificates curl git

# Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

mkdir -p /var/www/ecommerce
cd /var/www/ecommerce

echo "Docker installed. Next steps:"
echo "1. Clone repo: git clone -b ecomm https://github.com/avinashims/nodeapi.git ."
echo "2. cp .env.docker.example .env && nano .env"
echo "3. docker compose -f docker-compose.prod.yml up -d"
