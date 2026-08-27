// Privater Zugang per persönlichem Einmal-Code.
//
// Beim ersten Öffnen gibt die Person ihren Code ein. Der Code wird serverseitig
// (Netlify Function "redeem") an dieses Gerät gebunden – ein weitergeleiteter
// Code funktioniert dann auf einem anderen Gerät nicht mehr. Nach erfolgreicher
// Freischaltung merkt sich das Gerät den Zugang lokal (offline-fähig).
//
// WICHTIG: Dies steuert nur den Zugang zur App. Die Buchhaltungsdaten liegen
// weiterhin ausschließlich lokal (IndexedDB) – der Check geht nur einmal online.

const DEVICE_KEY = 'bh_device_id'
const GRANT_KEY = 'bh_access_grant'

export interface AccessGrant {
  code: string
  grant: string
  device: string
  at: number
}

/** Ist das Zugangs-Gate aktiv? (Build-Flag VITE_ACCESS_GATE=on) */
export function gateActive(): boolean {
  return import.meta.env.VITE_ACCESS_GATE === 'on'
}

/** Stabile, zufällige Geräte-ID (einmal erzeugt, danach persistent). */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function readGrant(): AccessGrant | null {
  try {
    const raw = localStorage.getItem(GRANT_KEY)
    if (!raw) return null
    const g = JSON.parse(raw) as Partial<AccessGrant>
    if (typeof g.grant === 'string' && typeof g.code === 'string') return g as AccessGrant
    return null
  } catch {
    return null
  }
}

function storeGrant(g: AccessGrant): void {
  localStorage.setItem(GRANT_KEY, JSON.stringify(g))
}

/** Hat dieses Gerät Zugang? (true, wenn das Gate deaktiviert ist.) */
export function hasAccess(): boolean {
  return !gateActive() || readGrant() !== null
}

/** Code + Gerät für authentifizierte Aufrufe (z. B. Managed-AI-Scan). */
export function accessAuth(): { code: string; device: string } | null {
  const g = readGrant()
  if (!g) return null
  return { code: g.code, device: g.device }
}

export type RedeemResult = { ok: true } | { ok: false; reason: 'invalid' | 'used' | 'network' }

/** Löst einen Code beim Server ein und speichert den Zugang bei Erfolg. */
export async function redeemCode(code: string): Promise<RedeemResult> {
  const device = getDeviceId()
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { ok: false, reason: 'invalid' }
  try {
    const res = await fetch('/.netlify/functions/redeem', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: normalized, device }),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; grant?: string; reason?: string }
    if (res.ok && data.ok) {
      storeGrant({ code: normalized, grant: data.grant ?? '', device, at: Date.now() })
      return { ok: true }
    }
    return { ok: false, reason: data.reason === 'used' ? 'used' : 'invalid' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}
