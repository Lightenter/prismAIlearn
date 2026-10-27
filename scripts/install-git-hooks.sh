#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
hooks_path=$(git -C "$repo_root" config --local --get core.hooksPath || true)
if [[ -n "$hooks_path" && "$hooks_path" != ".githooks" ]]; then
  printf 'Refus de remplacer core.hooksPath déjà configuré (%s).\n' "$hooks_path" >&2
  exit 1
fi

hook="$repo_root/.githooks/pre-commit"
if [[ ! -f "$hook" ]]; then
  printf 'Hook pré-commit introuvable : %s\n' "$hook" >&2
  exit 1
fi
chmod +x "$hook"
git -C "$repo_root" config --local core.hooksPath .githooks
printf 'Garde-fou pré-commit installé pour ce clone Git.\n'
