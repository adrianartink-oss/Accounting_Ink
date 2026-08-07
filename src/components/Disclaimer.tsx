import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Rechtlicher Hinweis, der beim ersten Start bestätigt werden muss. */
export default function Disclaimer({ onAccept }: { onAccept: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="card max-w-lg">
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            <ShieldAlert size={24} color="var(--accent)" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
            {t('disclaimer.title')}
          </h1>
        </div>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          <p>{t('disclaimer.p1')}</p>
          <p>{t('disclaimer.p2')}</p>
          <p>{t('disclaimer.p3')}</p>
        </div>
        <button className="btn btn-primary mt-6 w-full" onClick={onAccept}>
          {t('disclaimer.accept')}
        </button>
      </div>
    </div>
  )
}
