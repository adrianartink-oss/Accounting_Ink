# Buchhaltung Privat 🧾

Private Buchhaltungs-App (PWA) für ein Tattoo-Einzelunternehmen mit Fokus auf
**EÜR (Einnahmen-Überschuss-Rechnung)**, saubere Trennung nach **Land (DE/ES)**
und **Sphäre (gewerblich/privat)** – optimiert fürs iPad und mit
**Claude-Beleg-Scan**.

> ⚠️ **Hinweis:** Dies ist ein privates Organisations- und Übersichtswerkzeug,
> **keine zertifizierte GoBD-Buchhaltungssoftware**. Für die Steuererklärung
> bleiben Export und Abstimmung mit Steuerberater bzw. ELSTER maßgeblich. Der
> Umzug DE → ES ist steuerlich komplex – die App strukturiert die Daten nach
> Land, ersetzt aber keine Steuerberatung.

## Features

- 📥 **Buchungen erfassen** – Einnahmen/Ausgaben mit Kategorie, Land, Sphäre, Beleg
- 🇩🇪🇪🇸 **Trennung nach Land & Sphäre** – DE vs. ES, gewerblich vs. privat
- 📊 **Dashboard** – Einnahmen/Ausgaben/Überschuss, Monatsverlauf, Top-Ausgaben
- 🧾 **EÜR-Berichte** – je Jahr & Land, Export als CSV (Steuerberater) & PDF (Druck)
- ✨ **Claude-Beleg-Scan** – Foto oder Freitext → automatisch vorausgefüllte Buchung
- 🔒 **Local-first** – alle Daten bleiben verschlüsselt im Browser (IndexedDB)
- 💾 **Backup** – optional AES-verschlüsselter Datei-Export/-Import
- 📱 **PWA** – im Browser und als installierbare iPad-App (offline-fähig)
- 🌗 **Hell/Dunkel** – system-, hell- oder dunkelabhängiges Design

## Tech-Stack

Vite · React · TypeScript · Tailwind CSS · Dexie (IndexedDB) · Recharts ·
`@anthropic-ai/sdk` · Web Crypto API · vite-plugin-pwa

## Schnellstart

```bash
./setup.sh          # oder: npm install
npm run dev         # http://localhost:5173
```

Weitere Befehle:

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build (PWA) |
| `npm run preview` | Build lokal testen |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript prüfen |

## KI-Funktionen aktivieren

1. In den **Einstellungen → KI-Anbindung** deinen Anthropic-API-Key eintragen
   (erhältlich unter [console.anthropic.com](https://console.anthropic.com)).
2. Der Key wird **verschlüsselt lokal** gespeichert; Aufrufe gehen direkt vom
   Browser an Anthropic.
3. Modell wählbar: `claude-opus-4-8` (genauer) oder `claude-haiku-4-5`
   (schneller & günstiger).

## Als iPad-App installieren

In Safari öffnen → **Teilen** → **„Zum Home-Bildschirm"**. Die App startet dann
im Vollbild mit eigenem Icon und funktioniert offline.

## Projektstruktur

```
src/
  db/         Datenmodell, Dexie-Schema, Kategorien-Seed, Krypto, Repository
  lib/        Money, EÜR-Berechnung, Anthropic-Client, Bild- & Export-Helfer
  store/      React-Hooks (reaktive Dexie-Queries)
  components/ TransactionForm, FilterBar, StatTile, Charts, …
  pages/      Dashboard, Transactions, AddTransaction, Scan, Reports,
              Categories, SettingsPage
scripts/
  gen-icons.mjs   PWA-Icons aus favicon.svg rendern (benötigt playwright)
.claude/
  hooks/session-start.sh   Claude-Code SessionStart-Hook (installiert Deps)
  settings.json            Hook-Registrierung
```

## Datenschutz

Alle Buchungen, Kategorien und Belege liegen ausschließlich lokal im Browser
(IndexedDB). Es gibt keinen Server. Nur beim Beleg-Scan wird das Bild an die
Anthropic-API gesendet. Backups sind optional AES-GCM-verschlüsselbar.

## Icons neu erzeugen (optional)

```bash
npm install -D playwright        # Browser ist im Agent-Env vorinstalliert
node scripts/gen-icons.mjs       # ggf. CHROMIUM_PATH setzen
```
