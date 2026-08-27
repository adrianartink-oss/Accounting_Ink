import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { redeemCode } from '../lib/accessgate'

/**
 * Zugangs-Bildschirm für den privaten Link. Wird vor allem anderen angezeigt,
 * solange dieses Gerät noch keinen gültigen Code eingelöst hat. Bei Erfolg wird
 * `onGranted` aufgerufen; der Zugang bleibt danach lokal gespeichert.
 */
export default function AccessGate({ onGranted }: { onGranted: () => void }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await redeemCode(code)
      if (result.ok) {
        onGranted()
        return
      }
      setError(t(`accessGate.error_${result.reason}`))
    } finally {
      setBusy(false)
    }
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
            <KeyRound size={26} color="var(--accent)" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
              {t('accessGate.title')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {t('accessGate.subtitle')}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="input text-center tracking-widest uppercase"
            placeholder={t('accessGate.codePlaceholder')}
            value={code}
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && (
            <p className="text-center text-sm" style={{ color: 'var(--expense)' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={busy || code.trim().length === 0}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}{' '}
            {busy ? t('accessGate.checking') : t('accessGate.submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--muted)' }}>
          {t('accessGate.hint')}
        </p>
      </div>
    </div>
  )
}
