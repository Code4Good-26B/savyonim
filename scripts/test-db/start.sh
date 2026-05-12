#!/usr/bin/env sh
set -eu

node ./scripts/validate-local-env.mjs

DOCKER_BIN="${DOCKER_BIN:-$(./scripts/test-db/docker-bin.sh)}"

"${DOCKER_BIN}" compose up -d test-db
"${DOCKER_BIN}" compose exec -T test-db sh -c 'until pg_isready -U postgres -d postgres; do sleep 1; done'
