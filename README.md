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
- 🧮 **Umsatzsteuer-Modus** – Kleinunternehmer §19 oder Regelbesteuerung mit
  länderabhängigen Sätzen (DE 19/7 %, ES/IVA 21/10/4 %) und USt-Voranmeldung
- 🔁 **Wiederkehrende Buchungen** – Miete, Versicherung & Co. automatisch anlegen
- ✨ **Claude-Beleg-Scan** – Foto oder Freitext → automatisch vorausgefüllte Buchung
- 🤖 **KI-Zusammenfassung** – Claude fasst Zahlen & Auffälligkeiten je Zeitraum zusammen
- 🔒 **Local-first** – alle Daten bleiben verschlüsselt im Browser (IndexedDB)
- 💾 **Backup** – optional AES-verschlüsselter Datei-Export/-Import inkl. Erinnerung
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
| `npm test` | Unit-Tests (Vitest) |

## KI-Funktionen aktivieren

1. In den **Einstellungen → KI-Anbindung** deinen Anthropic-API-Key eintragen
   (erhältlich unter [console.anthropic.com](https://console.anthropic.com)).
2. Der Key wird **verschlüsselt lokal** gespeichert; Aufrufe gehen direkt vom
   Browser an Anthropic.
3. Modell wählbar: `claude-opus-4-8` (genauer) oder `claude-haiku-4-5`
   (schneller & günstiger).

## Kostenloses Hosting (Live-Link)

Die App ist eine rein statische PWA – jeder kostenlose Static-Host liefert sie
inkl. HTTPS aus. **Deine Buchhaltungsdaten bleiben dabei lokal auf dem Gerät;
gehostet wird nur der App-Code.**

**Ein-Klick-Deploy** (nutzt den Standard-Branch `main`):

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/adrianartink-oss/Buchaltung_Software_priv)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/adrianartink-oss/Buchaltung_Software_priv)

**Oder Repo verbinden und Branch wählen** (funktioniert auch ohne Merge nach `main`):

| Host | Vorgehen |
| --- | --- |
| **Netlify** | Repo importieren → Branch wählen → Build/Verzeichnis sind via `netlify.toml` vorbelegt |
| **Vercel** | Repo importieren → Branch wählen → Einstellungen via `vercel.json` |
| **Cloudflare Pages** | Repo verbinden → Branch wählen → Build `npm run build`, Output `dist` |
| **GitHub Pages** | Settings → Pages → Source: „GitHub Actions" (`.github/workflows/deploy.yml`) |

`public/_redirects` und `public/_headers` liefern SPA-Fallback und sinnvolle
Header für Netlify/Cloudflare automatisch mit.

## Als iPad-App installieren

Den Live-Link (oder lokal `http://localhost:5173`) in Safari öffnen → **Teilen**
→ **„Zum Home-Bildschirm"**. Die App startet dann im Vollbild mit eigenem Icon
und funktioniert offline.

## Projektstruktur

```
src/
  db/         Datenmodell, Dexie-Schema, Kategorien-Seed, Krypto, Repository
  lib/        Money, EÜR-Berechnung, USt (vat), wiederkehrende Regeln,
              Anthropic-Client, Bild- & Export-Helfer (+ *.test.ts)
  store/      React-Hooks (reaktive Dexie-Queries)
  components/ TransactionForm, FilterBar, StatTile, Charts, …
  pages/      Dashboard, Transactions, AddTransaction, Scan, Reports,
              Categories, Recurring, SettingsPage
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
