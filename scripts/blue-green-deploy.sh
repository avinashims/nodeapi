#!/usr/bin/env bash
# Blue/green deploy — deploy new version to idle slot, health-check, switch proxy.
# Usage: ./scripts/blue-green-deploy.sh [qa|prod] [deploy|rollback|status]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV="${DEPLOY_ENV:-prod}"
CMD="deploy"

if [[ "${1:-}" == "qa" || "${1:-}" == "prod" ]]; then
  ENV="$1"
  shift
fi

if [[ -n "${1:-}" ]]; then
  CMD="$1"
fi

COMPOSE_FILE=""
ACTIVE_FILE=""
UPSTREAM_FILE=""
IMAGE_TAG=""
CONTAINER_PREFIX=""
BLUE_PORT=""
GREEN_PORT=""

log() {
  echo "[blue-green:$ENV] $*"
}

load_config() {
  case "$ENV" in
    qa)
      COMPOSE_FILE="docker-compose.qa.yml"
      ACTIVE_FILE="deploy/state/.active"
      UPSTREAM_FILE="deploy/state/active.upstream.conf"
      IMAGE_TAG="${IMAGE_TAG:-qa}"
      CONTAINER_PREFIX="ecommerce-qa"
      BLUE_PORT=8091
      GREEN_PORT=8092
      ;;
    prod)
      COMPOSE_FILE="docker-compose.prod.yml"
      ACTIVE_FILE="deploy/state/.active"
      UPSTREAM_FILE="deploy/state/active.upstream.conf"
      IMAGE_TAG="${IMAGE_TAG:-latest}"
      CONTAINER_PREFIX="ecommerce"
      BLUE_PORT=8081
      GREEN_PORT=8082
      ;;
    *)
      echo "Unknown environment: $ENV (use qa or prod)" >&2
      exit 1
      ;;
  esac
}

slot_port() {
  case "$1" in
    blue) echo "$BLUE_PORT" ;;
    green) echo "$GREEN_PORT" ;;
    *) echo "Unknown slot: $1" >&2; exit 1 ;;
  esac
}

web_container_name() {
  echo "${CONTAINER_PREFIX}-web-$1"
}

write_upstream() {
  local slot="$1"
  mkdir -p "$(dirname "$UPSTREAM_FILE")"
  cat > "$UPSTREAM_FILE" <<EOF
upstream active_backend {
    server web-${slot}:80;
}
EOF
}

reload_proxy() {
  docker compose -f "$COMPOSE_FILE" exec -T proxy nginx -s reload
}

get_active() {
  if [ -f "$ACTIVE_FILE" ]; then
    tr -d '[:space:]' < "$ACTIVE_FILE"
  else
    echo "blue"
  fi
}

get_inactive() {
  if [ "$(get_active)" = "blue" ]; then
    echo "green"
  else
    echo "blue"
  fi
}

ensure_state_files() {
  mkdir -p deploy/state
  # Docker creates a directory if the mount file was missing on first proxy start
  if [ -d "$UPSTREAM_FILE" ]; then
    rm -rf "$UPSTREAM_FILE"
  fi
  if [ ! -f "$ACTIVE_FILE" ]; then
    echo "blue" > "$ACTIVE_FILE"
  fi
  write_upstream "$(get_active)"
}

sync_live_routing() {
  write_upstream "$(get_active)"
  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx "proxy"; then
    reload_proxy
  fi
}

ensure_infra() {
  docker compose -f "$COMPOSE_FILE" up -d mysql redis
  if docker ps --format '{{.Names}}' | grep -qE "${CONTAINER_PREFIX}-web-(blue|green)"; then
    docker compose -f "$COMPOSE_FILE" up -d proxy
  fi
}

start_proxy() {
  docker compose -f "$COMPOSE_FILE" up -d proxy
}

remove_legacy_containers() {
  case "$ENV" in
    qa)
      docker rm -f ecommerce-qa-api-1 ecommerce-qa-web-1 ecommerce-qa-api ecommerce-qa-web 2>/dev/null || true
      ;;
    prod)
      docker rm -f ecommerce-api-1 ecommerce-web-1 ecommerce-api ecommerce-web 2>/dev/null || true
      ;;
  esac
}

wait_for_health() {
  local slot="$1"
  local port
  port="$(slot_port "$slot")"
  log "Waiting for /api/health on slot=$slot port=$port ..."
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${port}/api/health" >/dev/null; then
      log "Health check passed for $slot"
      return 0
    fi
    sleep 2
  done
  log "Health check FAILED for $slot"
  return 1
}

switch_traffic() {
  local slot="$1"
  write_upstream "$slot"
  reload_proxy
  echo "$slot" > "$ACTIVE_FILE"
  log "Traffic switched to $slot"
}

deploy_slot() {
  local slot="$1"
  export IMAGE_TAG
  docker compose -f "$COMPOSE_FILE" pull "api-${slot}" "web-${slot}"
  docker compose -f "$COMPOSE_FILE" up -d "api-${slot}" "web-${slot}"
}

cmd_deploy() {
  ensure_state_files
  remove_legacy_containers
  ensure_infra
  sync_live_routing

  local active inactive
  active="$(get_active)"
  inactive="$(get_inactive)"

  if ! docker ps --format '{{.Names}}' | grep -q "$(web_container_name "$active")"; then
    log "No running active slot detected — bootstrapping blue"
    active="blue"
    inactive="green"
    echo "blue" > "$ACTIVE_FILE"
    write_upstream "blue"
    deploy_slot "blue"
    wait_for_health "blue"
    start_proxy
    switch_traffic "blue"
    docker compose -f "$COMPOSE_FILE" ps
    return 0
  fi

  log "Active slot: $active — deploying to inactive: $inactive (IMAGE_TAG=$IMAGE_TAG)"

  deploy_slot "$inactive"
  wait_for_health "$inactive"
  switch_traffic "$inactive"

  log "Stopping previous slot: $active"
  docker compose -f "$COMPOSE_FILE" stop "api-${active}" "web-${active}" || true

  docker compose -f "$COMPOSE_FILE" ps
  log "Deploy complete — live slot: $inactive"
}

cmd_rollback() {
  ensure_state_files
  ensure_infra
  sync_live_routing

  local active previous
  active="$(get_active)"
  previous="$(get_inactive)"

  log "Rolling back from $active to $previous"
  docker compose -f "$COMPOSE_FILE" up -d "api-${previous}" "web-${previous}"
  wait_for_health "$previous"
  switch_traffic "$previous"
  docker compose -f "$COMPOSE_FILE" stop "api-${active}" "web-${active}" || true
  docker compose -f "$COMPOSE_FILE" ps
}

cmd_status() {
  ensure_state_files
  log "Active slot: $(get_active)"
  log "IMAGE_TAG: $IMAGE_TAG"
  log "Health ports: blue=$BLUE_PORT green=$GREEN_PORT"
  docker compose -f "$COMPOSE_FILE" ps
  echo "--- active.upstream.conf ---"
  cat "$UPSTREAM_FILE"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [qa|prod] <command>

Environments:
  qa    QA server (docker-compose.qa.yml, port 8080, :qa images)
  prod  Production (docker-compose.prod.yml, port 80, :latest images)

Commands:
  deploy    Deploy to idle slot, health-check, switch traffic (default)
  rollback  Switch traffic back to the previous slot
  status    Show active slot and container status
EOF
}

main() {
  load_config
  case "$CMD" in
    deploy) cmd_deploy ;;
    rollback) cmd_rollback ;;
    status) cmd_status ;;
    -h|--help|help) usage ;;
    *) usage; exit 1 ;;
  esac
}

main
