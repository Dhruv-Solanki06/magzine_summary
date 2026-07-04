#!/usr/bin/env bash
# Run LOCALLY (on your machine). Builds the production image and pushes it to
# Docker Hub. Does NOT touch any server.
#
#   ./scripts/build-and-push.sh            # builds + pushes :latest (and :<gitsha>)
#   TAG=v1.2.0 ./scripts/build-and-push.sh # also tags a specific version
#
# Requires: docker, a logged-in Docker Hub account (`docker login`), and a .env
# file in the project root (its NEXT_PUBLIC_* values are baked into the client
# bundle at build time via docker-compose build args).
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE_NAME="${IMAGE_NAME:-dhruvsh-1729/magzine-summary}"
TAG="${TAG:-latest}"
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo manual)"

export IMAGE_NAME TAG

if [ ! -f .env ]; then
  echo "WARNING: no .env found — NEXT_PUBLIC_* values will be empty in the build." >&2
fi

echo "==> Building ${IMAGE_NAME}:${TAG} (also tagging :${GIT_SHA})"
# compose reads .env for the build args automatically.
docker compose build web

# Add an immutable git-sha tag alongside the moving :latest tag.
docker tag "${IMAGE_NAME}:${TAG}" "${IMAGE_NAME}:${GIT_SHA}"

echo "==> Pushing ${IMAGE_NAME}:${TAG}"
docker push "${IMAGE_NAME}:${TAG}"
echo "==> Pushing ${IMAGE_NAME}:${GIT_SHA}"
docker push "${IMAGE_NAME}:${GIT_SHA}"

echo "✔ Pushed ${IMAGE_NAME}:${TAG} and ${IMAGE_NAME}:${GIT_SHA}"
