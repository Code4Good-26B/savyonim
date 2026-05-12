#!/usr/bin/env sh
set -eu

DOCKER_BIN="${DOCKER_BIN:-$(./scripts/test-db/docker-bin.sh)}"

./scripts/test-db/start.sh

"${DOCKER_BIN}" compose exec -T test-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
drop schema if exists public cascade;
drop schema if exists auth cascade;

create schema public;
grant all on schema public to postgres;
grant all on schema public to public;
SQL

"${DOCKER_BIN}" compose exec -T test-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /workspace/scripts/test-db/00-auth-schema-stub.sql

"${DOCKER_BIN}" compose exec -T test-db sh -c '
  set -eu
  for migration in /workspace/supabase/migrations/*.sql; do
    echo "Applying ${migration}"
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f "${migration}"
  done
'
