import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, LockKeyhole, ShieldOff } from 'lucide-react'
import {
  LOCK_CHANGED_EVENT,
  getAutoLockMinutes,
  isLockEnabled,
  lockNow,
  removeLock,
  setAutoLockMinutes,
  setPassphrase,
} from '../lib/applock'

const AUTO_LOCK_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'nach 1 Minute' },
  { value: 5, label: 'nach 5 Minuten' },
  { value: 15, label: 'nach 15 Minuten' },
  { value: 0, label: 'nur beim Neustart' },
]

const MIN_LEN = 4

/**
 * Verwaltet die App-Sperre: Passwort setzen/ändern/entfernen, Auto-Sperr-Dauer
 * und sofortiges Sperren. Wird in den Einstellungen und im Onboarding genutzt.
 */
export default function AppLockSetup({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = useState(() => isLockEnabled())
  const [autoLock, setAutoLock] = useState(() => getAutoLockMinutes())
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const sync = () => {
      setEnabled(isLockEnabled())
      setAutoLock(getAutoLockMinutes())
    }
    window.addEventListener(LOCK_CHANGED_EVENT, sync)
    return () => window.removeEventListener(LOCK_CHANGED_EVENT, sync)
  }, [])

  async function save() {
    setError(null)
    if (pass.length < MIN_LEN) {
      setError(`Bitte mindestens ${MIN_LEN} Zeichen wählen.`)
      return
    }
    if (pass !== confirm) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    setBusy(true)
    try {
      await setPassphrase(pass, autoLock)
      setPass('')
      setConfirm('')
      setChanging(false)
    } finally {
      setBusy(false)
    }
  }

  function handleRemove() {
    if (confirm.length) return
    if (window.confirm('App-Sperre wirklich entfernen? Die App ist danach ohne Passwort zugänglich.')) {
      removeLock()
    }
  }

  // Formular zum Setzen/Ändern des Passworts.
  const showForm = !enabled || changing

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        {enabled ? (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--income)' }}>
            <CheckCircle2 size={16} /> App-Sperre aktiv
          </span>
        ) : (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
            <ShieldOff size={16} /> Keine App-Sperre
          </span>
        )}
      </div>

      {!compact && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Schützt die App mit einem Passwort beim Öffnen. Deine Daten liegen ohnehin nur auf
          diesem Gerät – die Sperre verhindert, dass jemand, der das Gerät in die Hand nimmt,
          deine Buchhaltung sieht.
        </p>
      )}

      {showForm && (
        <div className="space-y-2">
          <input
            className="input"
            type="password"
            placeholder={enabled ? 'Neues Passwort' : 'Passwort'}
            value={pass}
            autoComplete="new-password"
            onChange={(e) => setPass(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Passwort wiederholen"
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && (
            <p className="text-sm" style={{ color: 'var(--expense)' }}>
              {error}
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--expense)' }}>
            Wichtig: Merke dir das Passwort gut. Ohne Passwort kommst du nur über ein
            Zurücksetzen (Daten löschen) oder ein Backup wieder hinein.
          </p>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={save} disabled={busy}>
              <Lock size={18} /> {enabled ? 'Passwort ändern' : 'App-Sperre aktivieren'}
            </button>
            {enabled && (
              <button
                className="btn"
                onClick={() => {
                  setChanging(false)
                  setPass('')
                  setConfirm('')
                  setError(null)
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>
      )}

      {enabled && (
        <>
          <div>
            <label className="label">Automatisch sperren</label>
            <select
              className="input"
              value={autoLock}
              onChange={(e) => {
                const v = Number(e.target.value)
                setAutoLock(v)
                setAutoLockMinutes(v)
              }}
            >
              {AUTO_LOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {!changing && (
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => setChanging(true)}>
                <LockKeyhole size={18} /> Passwort ändern
              </button>
              <button className="btn" onClick={lockNow}>
                <Lock size={18} /> Jetzt sperren
              </button>
              <button className="btn" style={{ color: 'var(--expense)' }} onClick={handleRemove}>
                Sperre entfernen
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
