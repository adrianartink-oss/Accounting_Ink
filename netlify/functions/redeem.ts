// Öffentlicher Endpoint zum Einlösen eines persönlichen Zugangscodes.
//
// Ablauf: Der Code wird beim ersten Öffnen an das Gerät (zufällige deviceId)
// gebunden. Ein weitergeleiteter Code auf einem anderen Gerät wird abgewiesen,
// sobald das Gerätelimit (maxDevices, Standard 1) erreicht ist.
//
// Speicher: Netlify Blobs (Store "access-codes"), Schlüssel = Code.
import { getStore } from '@netlify/blobs'
import { createHmac } from 'node:crypto'

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

function sign(data: string): string {
  const secret = process.env.ACCESS_SIGNING_SECRET || 'dev-secret'
  return createHmac('sha256', secret).update(data).digest('hex')
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ ok: false, reason: 'invalid' }, 405)

  let body: { code?: string; device?: string }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, reason: 'invalid' }, 400)
  }

  const code = String(body.code || '').trim().toUpperCase()
  const device = String(body.device || '').trim()
  if (!code || !device) return json({ ok: false, reason: 'invalid' }, 400)

  const store = getStore({ name: 'access-codes', consistency: 'strong' })
  const rec = (await store.get(code, { type: 'json' })) as CodeRecord | null
  if (!rec || rec.revoked) return json({ ok: false, reason: 'invalid' })

  if (!rec.boundDevices.includes(device)) {
    if (rec.boundDevices.length >= (rec.maxDevices || 1)) {
      return json({ ok: false, reason: 'used' })
    }
    rec.boundDevices.push(device)
    await store.setJSON(code, rec)
  }

  return json({ ok: true, grant: sign(`${device}|${code}`) })
}
