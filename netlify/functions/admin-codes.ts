// Geschützter Admin-Endpoint zum Verwalten der Zugangscodes.
// Schutz: Header "Authorization: Bearer <ADMIN_SECRET>".
//
// Aktionen (JSON-Body { action, ... }):
//   create  { count, scanLimit?, maxDevices?, label? } → erzeugt Codes
//   list    → listet alle Codes + Nutzung
//   revoke  { code } → sperrt einen Code (blockiert neue Geräte)
//   reset   { code } → leert die Gerätebindung (z. B. Browserdaten gelöscht)
import { getStore } from '@netlify/blobs'
import { randomBytes } from 'node:crypto'

interface CodeRecord {
  createdAt: number
  boundDevices: string[]
  maxDevices: number
  scanLimit: number
  usage: Record<string, number>
  revoked?: boolean
  label?: string
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// Ohne mehrdeutige Zeichen (0/O, 1/I) für saubere Weitergabe.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genCode(): string {
  const bytes = randomBytes(8)
  let s = ''
  for (let i = 0; i < 8; i++) s += ALPHABET[bytes[i] % ALPHABET.length]
  return `INK-${s.slice(0, 4)}-${s.slice(4, 8)}`
}

export default async (req: Request): Promise<Response> => {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    /* leerer Body ist ok für einige Aktionen */
  }

  const action = String(body.action || '')
  const store = getStore({ name: 'access-codes', consistency: 'strong' })

  if (action === 'create') {
    const count = Math.min(500, Math.max(1, Number(body.count) || 1))
    const maxDevices = Math.max(1, Number(body.maxDevices) || 1)
    const scanLimit = Math.max(0, Number(body.scanLimit ?? 100))
    const label = String(body.label || '')
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = genCode()
      const rec: CodeRecord = {
        createdAt: Date.now(),
        boundDevices: [],
        maxDevices,
        scanLimit,
        usage: {},
        label,
      }
      await store.setJSON(code, rec)
      codes.push(code)
    }
    return json({ ok: true, codes })
  }

  if (action === 'list') {
    const { blobs } = await store.list()
    const codes = []
    for (const b of blobs) {
      const rec = (await store.get(b.key, { type: 'json' })) as CodeRecord | null
      if (!rec) continue
      const totalScans = Object.values(rec.usage || {}).reduce((a, n) => a + (Number(n) || 0), 0)
      codes.push({
        code: b.key,
        devices: rec.boundDevices?.length ?? 0,
        maxDevices: rec.maxDevices ?? 1,
        scanLimit: rec.scanLimit ?? 0,
        totalScans,
        revoked: !!rec.revoked,
        label: rec.label || '',
      })
    }
    codes.sort((a, b) => a.code.localeCompare(b.code))
    return json({ ok: true, codes })
  }

  if (action === 'revoke' || action === 'reset') {
    const code = String(body.code || '').trim().toUpperCase()
    if (!code) return json({ ok: false, error: 'missing-code' }, 400)
    const rec = (await store.get(code, { type: 'json' })) as CodeRecord | null
    if (!rec) return json({ ok: false, error: 'not-found' }, 404)
    if (action === 'revoke') {
      rec.revoked = true
    } else {
      rec.boundDevices = []
      rec.revoked = false
    }
    await store.setJSON(code, rec)
    return json({ ok: true })
  }

  return json({ ok: false, error: 'unknown-action' }, 400)
}
