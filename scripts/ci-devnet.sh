#!/bin/bash
set -euo pipefail

echo "Starting local devnet..."
docker compose up -d

echo "Waiting for services to become healthy (timeout: 5m)..."
deadline=$((SECONDS + 300))

while [ $SECONDS -lt $deadline ]; do
  node_state=$(docker compose ps node --format "{{.State}}" 2>/dev/null || echo "unknown")
  proof_state=$(docker compose ps proof-server --format "{{.State}}" 2>/dev/null || echo "unknown")
  indexer_state=$(docker compose ps indexer --format "{{.State}}" 2>/dev/null || echo "unknown")

  if [ "$node_state" = "running" ] && [ "$proof_state" = "running" ] && [ "$indexer_state" = "running" ]; then
    echo "All services are running."
    exit 0
  fi

  if [ "$indexer_state" = "exited" ] || [ "$indexer_state" = "dead" ]; then
    echo "Indexer exited (state=$indexer_state). Showing logs:"
    docker compose logs --no-color indexer || true
    echo "Retrying in 5s..."
    sleep 5
    docker compose up -d indexer || true
    continue
  fi

  sleep 3
done

echo "Devnet did not become healthy within timeout."
docker compose ps
docker compose logs --no-color indexer || true
exit 1
