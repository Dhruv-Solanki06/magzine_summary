#!/usr/bin/env bash
# Full one-shot deploy from a machine that both builds and serves:
#   1. pull the latest source from git
#   2. build the production image
#   3. push it to Docker Hub
#   4. restart the running container from the freshly built image
#
#   ./deploy.sh
#   TAG=v1.2.0 ./deploy.sh
#
# For a split workflow instead, use:
#   • scripts/build-and-push.sh     (locally: build + push)
#   • scripts/deploy-on-instance.sh (on the server: pull + restart)
set -euo pipefail

cd "$(dirname "$0")"

IMAGE_NAME="${IMAGE_NAME:-dhruvsh/magzine-summary}"
TAG="${TAG:-latest}"
export IMAGE_NAME TAG

echo "==> [1/4] Pulling latest source"
git pull --ff-only

echo "==> [2/4] Building & [3/4] pushing image"
./scripts/build-and-push.sh

echo "==> [4/4] Restarting container"
docker compose up -d --no-build --force-recreate
docker image prune -f >/dev/null 2>&1 || true

docker compose ps
echo "✔ Deploy complete (${IMAGE_NAME}:${TAG})"
