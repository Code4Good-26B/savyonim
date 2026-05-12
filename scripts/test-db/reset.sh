#!/usr/bin/env sh
set -eu

./scripts/test-db/load-schema.sh
./scripts/test-db/seed.sh
