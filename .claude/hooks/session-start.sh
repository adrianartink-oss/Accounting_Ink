#!/bin/bash
# SessionStart-Hook für Claude Code (Web & lokal): installiert die
# Projekt-Abhängigkeiten, damit Build, Lint und Dev-Server sofort laufen.
# Synchron (kein async), damit die Session erst nach dem Install startet.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Node-Version melden (informativ).
if command -v node >/dev/null 2>&1; then
  echo "Node $(node --version)"
fi

# Idempotent: npm install nutzt den Cache und ist wiederholbar.
if [ -f package-lock.json ]; then
  echo "Installiere Abhängigkeiten (npm install)…"
  npm install --no-audit --no-fund
else
  echo "Kein package-lock.json gefunden – überspringe Install."
fi

echo "Setup abgeschlossen. Nützliche Befehle: npm run dev | build | lint | typecheck"
