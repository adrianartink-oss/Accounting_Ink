#!/bin/bash
# Einmaliges Setup-Skript für das Projekt (lokal oder Claude Code).
# Installiert Abhängigkeiten und zeigt die nächsten Schritte.
set -euo pipefail

cd "$(dirname "$0")"

echo "▶ Buchhaltung Privat – Setup"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js wird benötigt (empfohlen: v20+). Bitte installieren: https://nodejs.org"
  exit 1
fi
echo "✓ Node $(node --version)"

echo "▶ Installiere Abhängigkeiten…"
npm install --no-audit --no-fund

echo
echo "✓ Fertig! Nächste Schritte:"
echo "   npm run dev        – Entwicklungsserver starten (http://localhost:5173)"
echo "   npm run build      – Produktions-Build (PWA) erzeugen"
echo "   npm run preview    – Produktions-Build lokal testen"
echo "   npm run lint       – Code prüfen"
echo "   npm run typecheck  – TypeScript prüfen"
echo
echo "Icons neu erzeugen (optional): node scripts/gen-icons.mjs"
echo "PWA aufs iPad: In Safari öffnen → Teilen → 'Zum Home-Bildschirm'."
