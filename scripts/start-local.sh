#!/usr/bin/env bash
# Démarre PrismAI en local en une seule commande, depuis un clone frais.
# Idempotent : ne réinstalle ni ne reconstruit inutilement.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '\033[1;35m▸\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$1"; }

# 1. Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js est requis (version 20 ou plus récente) : https://nodejs.org" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20+ est requis, version détectée : $(node -v)" >&2
  exit 1
fi

# 2. pnpm via Corepack (aligné sur le champ packageManager du dépôt)
if ! command -v pnpm >/dev/null 2>&1; then
  say "Activation de pnpm via Corepack…"
  corepack enable 2>/dev/null || true
  corepack prepare "$(node -p 'require("./package.json").packageManager')" --activate
fi

# 3. Dépendances
if [ ! -d node_modules ] || [ ! -f node_modules/.modules.yaml ]; then
  say "Installation des dépendances (pnpm install)…"
  pnpm install --frozen-lockfile
else
  say "Dépendances déjà installées."
fi

# 4. Variables d'environnement : Next.js lit uniquement apps/web/.env.local
if [ ! -f apps/web/.env.local ]; then
  say "Création de apps/web/.env.local depuis apps/web/.env.example…"
  cp apps/web/.env.example apps/web/.env.local
  warn "Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY pour activer l'authentification."
  warn "Sans ces valeurs, la landing, les tarifs et les studios restent consultables."
fi

# 5. Build des packages internes : ils exposent dist/, donc le web ne démarre pas sans eux
if [ ! -f packages/contracts/dist/index.js ]; then
  say "Compilation des packages internes (première fois, ~30 s)…"
  pnpm build --filter './packages/*'
fi

# 6. Démarrage : web sur 3000 et API sur 3001
port_busy() { (command -v ss >/dev/null && ss -ltn 2>/dev/null | grep -q ":$1 ") || (command -v lsof >/dev/null && lsof -i ":$1" -sTCP:LISTEN >/dev/null 2>&1); }
if port_busy 3000; then
  echo "Le port 3000 est déjà occupé. Libérez-le puis relancez ce script." >&2
  exit 1
fi

say "Démarrage de PrismAI…"
printf '\n   Site web      \033[36mhttp://localhost:3000\033[0m\n'
printf '   Page tarifs   \033[36mhttp://localhost:3000/pricing\033[0m\n'
printf '   API santé     \033[36mhttp://localhost:3001/health\033[0m\n\n'
printf '   Ctrl+C pour arrêter.\n\n'

# `pnpm dev` lance le web (next dev) et l'API en parallèle via Turborepo.
exec pnpm dev
