#!/bin/bash
# Create / repair the QA MySQL database on the server.
# Run: bash scripts/create-qa-database.sh
set -euo pipefail

QA_DIR="${QA_DIR:-/var/www/ecommerce-qa}"
COMPOSE_FILE="docker-compose.qa.yml"

if [ ! -f "$QA_DIR/.env" ]; then
  echo "ERROR: $QA_DIR/.env not found"
  exit 1
fi

cd "$QA_DIR"

read_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

MYSQL_ROOT_PASSWORD="$(read_env MYSQL_ROOT_PASSWORD)"
MYSQL_DATABASE="$(read_env MYSQL_DATABASE)"
MYSQL_USER="$(read_env MYSQL_USER)"
MYSQL_PASSWORD="$(read_env MYSQL_PASSWORD)"

MYSQL_DATABASE="${MYSQL_DATABASE:-ecommerce_db_qa}"
MYSQL_USER="${MYSQL_USER:-ecom_user}"

if [ -z "$MYSQL_ROOT_PASSWORD" ] || [ -z "$MYSQL_PASSWORD" ]; then
  echo "ERROR: MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD must be set in .env"
  exit 1
fi

echo "Starting QA MySQL if needed..."
docker compose -f "$COMPOSE_FILE" up -d mysql

echo "Waiting for MySQL..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost -p"$MYSQL_ROOT_PASSWORD" --silent 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "Creating database '$MYSQL_DATABASE' and granting user '$MYSQL_USER'..."
docker compose -f "$COMPOSE_FILE" exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
ALTER USER '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SHOW DATABASES;
"

echo ""
echo "QA database is ready: ${MYSQL_DATABASE}"
echo "Workbench: host 165.22.209.200  port 3307  user ${MYSQL_USER}  schema ${MYSQL_DATABASE}"
echo "Do not use port 3306 — that is production."
