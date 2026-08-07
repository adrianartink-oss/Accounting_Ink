import { HardDrive, KeyRound, Save, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AppLockSetup from './AppLockSetup'

/**
 * Erst-Start-Onboarding. Erklärt das local-first-Prinzip (Daten bleiben auf dem
 * Gerät, jede:r nutzt die App eigenständig), erinnert an Backups und lässt
 * optional direkt eine App-Sperre einrichten.
 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-screen items-start justify-center p-4 sm:items-center sm:p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="card my-4 w-full max-w-lg">
        <div className="mb-5">
          <div className="font-brand text-3xl" style={{ color: 'var(--accent)' }}>
            {t('onboarding.welcome')}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {t('onboarding.subtitle')}
          </p>
        </div>

        <div className="space-y-4">
          <InfoRow icon={<HardDrive size={20} color="var(--accent)" />} title={t('onboarding.dataTitle')}>
            {t('onboarding.dataBody')}
          </InfoRow>

          <InfoRow icon={<Save size={20} color="var(--accent)" />} title={t('onboarding.backupTitle')}>
            {t('onboarding.backupBody')}
          </InfoRow>

          <InfoRow icon={<KeyRound size={20} color="var(--accent)" />} title={t('onboarding.scanTitle')}>
            {t('onboarding.scanBody')}
          </InfoRow>

          <div
            className="rounded-xl border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-elev)' }}
          >
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={20} color="var(--accent)" />
              <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                {t('onboarding.lockTitle')}
              </span>
            </div>
            <AppLockSetup compact />
          </div>
        </div>

        <button className="btn btn-primary mt-6 w-full" onClick={onDone}>
          {t('onboarding.start')}
        </button>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="font-semibold" style={{ color: 'var(--fg)' }}>
          {title}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {children}
        </p>
      </div>
    </div>
  )
}
