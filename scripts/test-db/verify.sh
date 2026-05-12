#!/usr/bin/env sh
set -eu

DOCKER_BIN="${DOCKER_BIN:-$(./scripts/test-db/docker-bin.sh)}"

./scripts/test-db/start.sh

"${DOCKER_BIN}" compose ps test-db
"${DOCKER_BIN}" compose exec -T test-db pg_isready -U postgres -d postgres
"${DOCKER_BIN}" compose exec -T test-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "select count(*) as service_zone_count from public.service_zones;"
