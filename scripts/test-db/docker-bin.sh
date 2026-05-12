#!/usr/bin/env sh

if command -v docker >/dev/null 2>&1; then
  command -v docker
elif [ -x /Applications/Docker.app/Contents/Resources/bin/docker ]; then
  printf '%s\n' /Applications/Docker.app/Contents/Resources/bin/docker
else
  printf '%s\n' "docker"
fi
