#!/usr/bin/env bash
# Exécute les tests d’intégration sans afficher les valeurs des secrets.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/test_supabase_connection.mjs"
node "$SCRIPT_DIR/test_r2_connection.mjs"
