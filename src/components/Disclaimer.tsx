import { ShieldAlert } from 'lucide-react'

/** Rechtlicher Hinweis, der beim ersten Start bestätigt werden muss. */
export default function Disclaimer({ onAccept }: { onAccept: () => void }) {
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
            Kurz vorab
          </h1>
        </div>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          <p>
            Diese App ist ein <strong style={{ color: 'var(--fg)' }}>privates
            Organisations- und Übersichtswerkzeug</strong> für deine Einnahmen und
            Ausgaben nach dem EÜR-Prinzip – <strong style={{ color: 'var(--fg)' }}>keine
            zertifizierte GoBD-Buchhaltungssoftware</strong>.
          </p>
          <p>
            Für die Steuererklärung bleiben der Export der Daten und die Abstimmung mit
            deinem Steuerberater bzw. ELSTER maßgeblich. Der Umzug von Deutschland nach
            Spanien (Steuer-Ansässigkeit, Doppelbesteuerungsabkommen, §19a EU-Regelung)
            ist steuerlich komplex – die App strukturiert deine Daten nach Land, ersetzt
            aber keine Steuerberatung.
          </p>
          <p>
            Alle Daten bleiben lokal auf deinem Gerät. Für die KI-Funktionen wird dein
            eigener Anthropic-API-Key genutzt; Belege werden dann zur Analyse an Anthropic
            gesendet.
          </p>
        </div>
        <button className="btn btn-primary mt-6 w-full" onClick={onAccept}>
          Verstanden – los geht's
        </button>
      </div>
    </div>
  )
}
