#!/usr/bin/env node
// Admin-CLI für die persönlichen Zugangscodes.
//
// Voraussetzung: zwei Umgebungsvariablen setzen (dieselben wie in Netlify):
//   ADMIN_BASE_URL = https://deine-seite.netlify.app
//   ADMIN_SECRET   = dein Admin-Geheimnis
//
// Nutzung:
//   node scripts/codes.mjs create 10 [--limit 100] [--devices 1] [--label "Max"]
//   node scripts/codes.mjs list
//   node scripts/codes.mjs revoke INK-XXXX-XXXX
//   node scripts/codes.mjs reset  INK-XXXX-XXXX

const base = process.env.ADMIN_BASE_URL
const secret = process.env.ADMIN_SECRET

if (!base || !secret) {
  console.error('Bitte ADMIN_BASE_URL und ADMIN_SECRET als Umgebungsvariablen setzen.')
  console.error('Beispiel: ADMIN_BASE_URL=https://accountink.netlify.app ADMIN_SECRET=... node scripts/codes.mjs list')
  process.exit(1)
}

const [, , action, ...rest] = process.argv

function flag(name, fallback) {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 && rest[i + 1] != null ? rest[i + 1] : fallback
}

async function call(body) {
  const res = await fetch(`${base.replace(/\/$/, '')}/.netlify/functions/admin-codes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) {
    console.error('Fehler:', data.error || `HTTP ${res.status}`)
    process.exit(1)
  }
  return data
}

if (action === 'create') {
  const count = Number(rest[0]) || 1
  const data = await call({
    action: 'create',
    count,
    scanLimit: Number(flag('limit', 100)),
    maxDevices: Number(flag('devices', 1)),
    label: flag('label', ''),
  })
  console.log(`\n${data.codes.length} Code(s) erzeugt:\n`)
  for (const c of data.codes) console.log('  ' + c)
  console.log('\nJeden Code zusammen mit dem App-Link an genau eine Person geben.\n')
} else if (action === 'list') {
  const data = await call({ action: 'list' })
  if (!data.codes.length) {
    console.log('Noch keine Codes vorhanden.')
  } else {
    for (const c of data.codes) {
      console.log(
        `${c.code}  Geräte ${c.devices}/${c.maxDevices}  Scans ${c.totalScans}/${c.scanLimit}` +
          `${c.revoked ? '  [GESPERRT]' : ''}${c.label ? '  · ' + c.label : ''}`,
      )
    }
  }
} else if (action === 'revoke' || action === 'reset') {
  const code = (rest[0] || '').toUpperCase()
  if (!code) {
    console.error('Bitte einen Code angeben, z. B. INK-ABCD-1234')
    process.exit(1)
  }
  await call({ action, code })
  console.log(`${action === 'revoke' ? 'Gesperrt' : 'Zurückgesetzt'}: ${code}`)
} else {
  console.log('Nutzung:')
  console.log('  node scripts/codes.mjs create <n> [--limit 100] [--devices 1] [--label "Name"]')
  console.log('  node scripts/codes.mjs list')
  console.log('  node scripts/codes.mjs revoke <code>')
  console.log('  node scripts/codes.mjs reset  <code>')
}
