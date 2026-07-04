#!/usr/bin/env bash
# Run ON THE SERVER/INSTANCE. Pulls the latest image that was pushed to Docker
# Hub and restarts the container. Does NOT build anything.
#
#   ./scripts/deploy-on-instance.sh
#   TAG=v1.2.0 ./scripts/deploy-on-instance.sh
#
# Requires on the instance: docker + docker compose, this repo checked out (for
# docker-compose.yml), a logged-in Docker Hub account if the repo is private
# (`docker login`), and a populated .env file (runtime secrets + NEXT_PUBLIC_*).
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE_NAME="${IMAGE_NAME:-dhruvsh/magzine-summary}"
TAG="${TAG:-latest}"
export IMAGE_NAME TAG

if [ ! -f .env ]; then
  echo "ERROR: .env is required on the instance for runtime configuration." >&2
  exit 1
fi

echo "==> Pulling ${IMAGE_NAME}:${TAG}"
docker pull "${IMAGE_NAME}:${TAG}"

echo "==> Restarting container"
# --no-build: use the pulled image, never build on the instance.
docker compose up -d --no-build --force-recreate

echo "==> Pruning old images"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Status"
docker compose ps
echo "✔ Deployed ${IMAGE_NAME}:${TAG}"
