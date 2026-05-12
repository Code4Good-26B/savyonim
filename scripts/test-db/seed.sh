#!/usr/bin/env sh
set -eu

DOCKER_BIN="${DOCKER_BIN:-$(./scripts/test-db/docker-bin.sh)}"

./scripts/test-db/start.sh
"${DOCKER_BIN}" compose exec -T test-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /workspace/supabase/test-seed.sql
