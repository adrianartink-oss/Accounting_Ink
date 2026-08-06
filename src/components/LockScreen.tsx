import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { removeLock, verifyPassphrase } from '../lib/applock'
import { wipeAllData } from '../db/repo'

/**
 * Sperrbildschirm. Wird angezeigt, solange die App gesperrt ist. Bei korrektem
 * Passwort wird `onUnlock` aufgerufen. Für den Fall eines vergessenen Passworts
 * gibt es einen bewussten Notausgang (App zurücksetzen = lokale Daten löschen).
 */
export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showReset, setShowReset] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (await verifyPassphrase(pass)) {
        setPass('')
        onUnlock()
      } else {
        setError('Falsches Passwort.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    if (
      !window.confirm(
        'App zurücksetzen? Dabei werden ALLE lokalen Daten auf diesem Gerät gelöscht ' +
          '(Buchungen, Belege, Einstellungen). Nur fortfahren, wenn du ein Backup hast ' +
          'oder neu anfangen willst.',
      )
    ) {
      return
    }
    removeLock()
    await wipeAllData()
    window.location.reload()
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="card w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            <Lock size={26} color="var(--accent)" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
              Gesperrt
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Passwort eingeben, um auf deine Buchhaltung zuzugreifen.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="input text-center"
            type="password"
            placeholder="Passwort"
            value={pass}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => setPass(e.target.value)}
          />
          {error && (
            <p className="text-center text-sm" style={{ color: 'var(--expense)' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={busy || pass.length === 0}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />} Entsperren
          </button>
        </form>

        <div className="mt-4 text-center">
          {!showReset ? (
            <button
              className="text-xs underline"
              style={{ color: 'var(--muted)' }}
              onClick={() => setShowReset(true)}
            >
              Passwort vergessen?
            </button>
          ) : (
            <div className="space-y-2 text-xs" style={{ color: 'var(--muted)' }}>
              <p>
                Aus Sicherheitsgründen gibt es kein „Zurücksetzen" des Passworts, das die Daten
                erhält. Du kannst nur ganz neu anfangen (löscht alle lokalen Daten) – oder danach
                ein Backup einspielen, falls vorhanden.
              </p>
              <button
                className="btn w-full"
                style={{ color: 'var(--expense)' }}
                onClick={reset}
              >
                App zurücksetzen (Daten löschen)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
