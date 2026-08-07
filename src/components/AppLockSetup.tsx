import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, LockKeyhole, ShieldOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  LOCK_CHANGED_EVENT,
  getAutoLockMinutes,
  isLockEnabled,
  lockNow,
  removeLock,
  setAutoLockMinutes,
  setPassphrase,
} from '../lib/applock'

const AUTO_LOCK_OPTIONS: { value: number; key: string }[] = [
  { value: 1, key: 'security.autoLock1' },
  { value: 5, key: 'security.autoLock5' },
  { value: 15, key: 'security.autoLock15' },
  { value: 0, key: 'security.autoLockRestart' },
]

const MIN_LEN = 4

/**
 * Verwaltet die App-Sperre: Passwort setzen/ändern/entfernen, Auto-Sperr-Dauer
 * und sofortiges Sperren. Wird in den Einstellungen und im Onboarding genutzt.
 */
export default function AppLockSetup({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
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
      setError(t('security.errorMinLen', { min: MIN_LEN }))
      return
    }
    if (pass !== confirm) {
      setError(t('security.errorMismatch'))
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
    if (window.confirm(t('security.confirmRemove'))) {
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
            <CheckCircle2 size={16} /> {t('security.lockActive')}
          </span>
        ) : (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
            <ShieldOff size={16} /> {t('security.lockInactive')}
          </span>
        )}
      </div>

      {!compact && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {t('security.lockExplain')}
        </p>
      )}

      {showForm && (
        <div className="space-y-2">
          <input
            className="input"
            type="password"
            placeholder={enabled ? t('security.newPassword') : t('security.password')}
            value={pass}
            autoComplete="new-password"
            onChange={(e) => setPass(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder={t('security.repeatPassword')}
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
            {t('security.rememberWarning')}
          </p>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={save} disabled={busy}>
              <Lock size={18} /> {enabled ? t('security.changePassword') : t('security.activateLock')}
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
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {enabled && (
        <>
          <div>
            <label className="label">{t('security.autoLock')}</label>
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
                  {t(o.key)}
                </option>
              ))}
            </select>
          </div>

          {!changing && (
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => setChanging(true)}>
                <LockKeyhole size={18} /> {t('security.changePassword')}
              </button>
              <button className="btn" onClick={lockNow}>
                <Lock size={18} /> {t('security.lockNow')}
              </button>
              <button className="btn" style={{ color: 'var(--expense)' }} onClick={handleRemove}>
                {t('security.removeLock')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
