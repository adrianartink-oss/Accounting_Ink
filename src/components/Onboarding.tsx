import { HardDrive, KeyRound, Save, ShieldCheck } from 'lucide-react'
import AppLockSetup from './AppLockSetup'

/**
 * Erst-Start-Onboarding. Erklärt das local-first-Prinzip (Daten bleiben auf dem
 * Gerät, jede:r nutzt die App eigenständig), erinnert an Backups und lässt
 * optional direkt eine App-Sperre einrichten.
 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <div
      className="flex min-h-screen items-start justify-center p-4 sm:items-center sm:p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="card my-4 w-full max-w-lg">
        <div className="mb-5">
          <div className="font-brand text-3xl" style={{ color: 'var(--accent)' }}>
            Willkommen
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Deine private Buchhaltung (EÜR) – ganz auf deinem Gerät.
          </p>
        </div>

        <div className="space-y-4">
          <InfoRow icon={<HardDrive size={20} color="var(--accent)" />} title="Deine Daten bleiben bei dir">
            Alle Buchungen liegen ausschließlich lokal in diesem Browser, auf diesem Gerät. Es
            gibt keinen Server – niemand außer dir kann sie sehen.
          </InfoRow>

          <InfoRow icon={<Save size={20} color="var(--accent)" />} title="Bitte regelmäßig sichern">
            Weil die Daten nur lokal liegen, gibt es keine automatische Cloud-Sicherung. Exportiere
            in den Einstellungen ab und zu ein Backup (optional passwortgeschützt) und bewahre es
            sicher auf.
          </InfoRow>

          <InfoRow icon={<KeyRound size={20} color="var(--accent)" />} title="Beleg-Scan (optional)">
            Für die KI-Belegerkennung hinterlegst du in den Einstellungen deinen eigenen
            Anthropic-API-Key. Ohne Key funktioniert die App vollständig – nur der automatische
            Scan entfällt (die lokale Texterkennung geht weiterhin).
          </InfoRow>

          <div
            className="rounded-xl border p-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-elev)' }}
          >
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={20} color="var(--accent)" />
              <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                App mit Passwort schützen (optional)
              </span>
            </div>
            <AppLockSetup compact />
          </div>
        </div>

        <button className="btn btn-primary mt-6 w-full" onClick={onDone}>
          Los geht's
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
