import { useState } from 'react'
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldOff,
} from 'lucide-react'

// Owner-only Admin-Seite zum Erzeugen und Verwalten der persönlichen
// Zugangscodes. Erreichbar unter #/admin – umgeht bewusst das Zugangs-Gate,
// ist aber wertlos ohne das ADMIN_SECRET (jede Aktion wird serverseitig
// geprüft). Bewusst nur auf Deutsch – diese Seite sieht nur der Betreiber.

interface CodeItem {
  code: string
  devices: number
  maxDevices: number
  scanLimit: number
  totalScans: number
  revoked: boolean
  label: string
}

async function api(secret: string, body: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/admin-codes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('unauthorized')
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function errText(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (m === 'unauthorized') return 'Falsches Admin-Geheimnis.'
  if (m === 'Failed to fetch') return 'Keine Verbindung zur Server-Funktion (schon deployt?).'
  return `Fehler: ${m}`
}

export default function AdminCodes() {
  const [secret, setSecret] = useState('')
  const [count, setCount] = useState('5')
  const [limit, setLimit] = useState('100')
  const [devices, setDevices] = useState('1')
  const [label, setLabel] = useState('')
  const [created, setCreated] = useState<string[]>([])
  const [list, setList] = useState<CodeItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const ready = secret.trim().length > 0

  async function refresh(showBusy = true) {
    setError(null)
    if (showBusy) setBusy(true)
    try {
      const data = await api(secret.trim(), { action: 'list' })
      setList(data.codes ?? [])
    } catch (e) {
      setError(errText(e))
    } finally {
      if (showBusy) setBusy(false)
    }
  }

  async function create() {
    setError(null)
    setBusy(true)
    try {
      const data = await api(secret.trim(), {
        action: 'create',
        count: Number(count) || 1,
        scanLimit: Number(limit) || 0,
        maxDevices: Number(devices) || 1,
        label: label.trim(),
      })
      setCreated(data.codes ?? [])
      await refresh(false)
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function act(action: 'revoke' | 'reset', code: string) {
    const label =
      action === 'revoke'
        ? `Code ${code} sperren? Neue Geräte werden abgewiesen.`
        : `Code ${code} zurücksetzen? Die Gerätebindung wird geleert (z. B. wenn jemand seinen Browser gelöscht hat).`
    if (!window.confirm(label)) return
    setError(null)
    setBusy(true)
    try {
      await api(secret.trim(), { action, code })
      await refresh(false)
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied((c) => (c === text ? null : c)), 1500)
    } catch {
      /* Zwischenablage nicht verfügbar – dann eben manuell markieren. */
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            <KeyRound size={22} color="var(--accent)" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
              Zugangscodes verwalten
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nur für dich. Codes erzeugen und an ausgewählte Artists geben.
            </p>
          </div>
        </div>

        {/* Admin-Geheimnis */}
        <div className="card mb-4">
          <label className="label">Admin-Geheimnis</label>
          <input
            className="input"
            type="password"
            placeholder="ADMIN_SECRET (wie in Netlify hinterlegt)"
            value={secret}
            autoComplete="off"
            onChange={(e) => setSecret(e.target.value)}
          />
          <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            Wird nur für die Anfragen genutzt und nicht gespeichert.
          </p>
        </div>

        {/* Codes erzeugen */}
        <div className="card mb-4">
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--fg)' }}>
            Neue Codes erzeugen
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Anzahl</label>
              <input className="input" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div>
              <label className="label">Scans/Monat</label>
              <input className="input" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
            </div>
            <div>
              <label className="label">Geräte/Code</label>
              <input className="input" inputMode="numeric" value={devices} onChange={(e) => setDevices(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Notiz (optional)</label>
            <input
              className="input"
              placeholder="z. B. Name des Artists"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <button className="btn btn-primary mt-3 w-full" disabled={!ready || busy} onClick={create}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Codes erzeugen
          </button>

          {created.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                {created.length} neue Code(s) – jeweils an eine Person geben:
              </p>
              <div className="space-y-2">
                {created.map((c) => (
                  <div
                    key={c}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
                  >
                    <span className="font-mono tracking-wider" style={{ color: 'var(--fg)' }}>
                      {c}
                    </span>
                    <button className="rounded-lg p-1.5" onClick={() => copy(c)} title="Kopieren">
                      {copied === c ? <Check size={16} color="var(--income)" /> : <Copy size={16} color="var(--muted)" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bestehende Codes */}
        <div className="card mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
              Vergebene Codes
            </h2>
            <button className="btn" disabled={!ready || busy} onClick={() => refresh()}>
              <RefreshCw size={16} /> Laden
            </button>
          </div>
          {list == null ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              „Laden" tippen, um die vorhandenen Codes und ihre Nutzung zu sehen.
            </p>
          ) : list.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Noch keine Codes vorhanden.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((c) => (
                <div
                  key={c.code}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2"
                  style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}
                >
                  <span className="font-mono tracking-wider" style={{ color: c.revoked ? 'var(--muted)' : 'var(--fg)' }}>
                    {c.code}
                  </span>
                  {c.revoked && (
                    <span className="text-xs font-medium" style={{ color: 'var(--expense)' }}>
                      gesperrt
                    </span>
                  )}
                  {c.label && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      · {c.label}
                    </span>
                  )}
                  <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                    Geräte {c.devices}/{c.maxDevices} · Scans {c.totalScans}/{c.scanLimit}
                  </span>
                  <div className="flex gap-1">
                    <button
                      className="rounded-lg p-1.5"
                      title="Gerätebindung zurücksetzen"
                      disabled={busy}
                      onClick={() => act('reset', c.code)}
                    >
                      <RotateCcw size={16} color="var(--muted)" />
                    </button>
                    {!c.revoked && (
                      <button
                        className="rounded-lg p-1.5"
                        title="Code sperren"
                        disabled={busy}
                        onClick={() => act('revoke', c.code)}
                      >
                        <ShieldOff size={16} color="var(--expense)" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="card mb-4 text-sm" style={{ borderColor: 'var(--expense)', color: 'var(--expense)' }}>
            {error}
          </div>
        )}

        <a href="#/" className="text-sm underline" style={{ color: 'var(--muted)' }}>
          ← Zur App
        </a>
      </div>
    </div>
  )
}
