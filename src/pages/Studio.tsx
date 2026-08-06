import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Building2, Gauge, Target } from 'lucide-react'
import { db, updateSettings } from '../db/schema'
import { useTransactions } from '../store/hooks'
import { availableYears } from '../lib/euer'
import {
  KU_CURRENT_LIMIT_CENTS,
  KU_PRIOR_LIMIT_CENTS,
  kleinunternehmerStatus,
  tattooStats,
  yearlyBusinessNet,
} from '../lib/stats'
import { centsToInputString, formatCents, parseAmountToCents } from '../lib/money'
import type { Country, Settings } from '../db/types'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Divider from '../components/Divider'

export default function Studio() {
  const settings = useLiveQuery(() => db.settings.get('singleton'), [])
  const txs = useTransactions()
  if (!settings) {
    return (
      <div>
        <PageHeader title="Studio" />
        <div className="card text-center" style={{ color: 'var(--muted)' }}>
          Wird geladen…
        </div>
      </div>
    )
  }
  return <StudioInner settings={settings} txs={txs} />
}

function StudioInner({ settings, txs }: { settings: Settings; txs: ReturnType<typeof useTransactions> }) {
  const years = availableYears(txs)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const currentNet = yearlyBusinessNet(txs, year)
  const priorComputed = yearlyBusinessNet(txs, year - 1)
  const priorNet = priorComputed > 0 ? priorComputed : (settings.priorYearRevenueCents ?? 0)
  const ku = kleinunternehmerStatus(currentNet, priorNet)
  const tattoo = tattooStats(txs, year)

  // Lokale Eingabestände (StudioInner mountet erst mit geladenen Settings).
  const [priorStr, setPriorStr] = useState(
    settings.priorYearRevenueCents ? centsToInputString(settings.priorYearRevenueCents) : '',
  )
  const [targetStr, setTargetStr] = useState(
    settings.revenueTargetCents ? centsToInputString(settings.revenueTargetCents) : '',
  )
  const target = settings.revenueTargetCents ?? 0
  const targetPct = target > 0 ? currentNet / target : 0

  const patch = (p: Partial<Settings>) => updateSettings(p)

  return (
    <div>
      <PageHeader title="Studio" subtitle="Kennzahlen, Kleinunternehmer-Grenze & Stammdaten" />

      {/* Jahr wählen */}
      <div className="mb-5 flex flex-wrap gap-2">
        {years.map((y) => (
          <button key={y} className="chip" data-active={y === year} onClick={() => setYear(y)}>
            {y}
          </button>
        ))}
      </div>

      {/* Kennzahlen-Kacheln */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label={`Jahresumsatz ${year}`}
          value={formatCents(currentNet)}
          accent="var(--accent)"
          hint="netto, gewerblich"
        />
        <StatTile label="Ø-Preis / Tattoo" value={formatCents(tattoo.avgPriceCents)} />
        <StatTile label="Tattoos" value={String(tattoo.count)} hint={`${(tattoo.totalDurationMin / 60).toFixed(1)} Std.`} />
      </div>

      {/* §19-Ampel */}
      <div className="card mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Gauge size={18} color="var(--accent)" />
          <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
            Kleinunternehmer-Grenze (§19)
          </h2>
        </div>
        <LimitBar
          label={`Laufendes Jahr (${year})`}
          valueCents={currentNet}
          limitCents={KU_CURRENT_LIMIT_CENTS}
          limitLabel="100.000 €"
        />
        <div className="mt-3">
          <LimitBar
            label={`Vorjahr (${year - 1})`}
            valueCents={priorNet}
            limitCents={KU_PRIOR_LIMIT_CENTS}
            limitLabel="25.000 €"
          />
        </div>
        <p
          className="mt-3 text-sm font-medium"
          style={{ color: ku.status === 'ok' ? 'var(--income)' : 'var(--expense)' }}
        >
          {ku.message}
        </p>
        <div className="mt-3">
          <label className="label">Vorjahresumsatz manuell (falls vor App-Nutzung)</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="z. B. 18500"
            value={priorStr}
            onChange={(e) => {
              setPriorStr(e.target.value)
              patch({ priorYearRevenueCents: parseAmountToCents(e.target.value) ?? undefined })
            }}
          />
        </div>
      </div>

      {/* Umsatzziel */}
      <div className="card mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Target size={18} color="var(--accent)" />
          <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
            Umsatzziel {year}
          </h2>
        </div>
        <input
          className="input"
          inputMode="decimal"
          placeholder="Jahresziel in € (z. B. 40000)"
          value={targetStr}
          onChange={(e) => {
            setTargetStr(e.target.value)
            patch({ revenueTargetCents: parseAmountToCents(e.target.value) ?? undefined })
          }}
        />
        {target > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
              <span>{formatCents(currentNet)}</span>
              <span>{Math.round(targetPct * 100)}% von {formatCents(target)}</span>
            </div>
            <Bar pct={targetPct} color="var(--income)" />
          </div>
        )}
      </div>

      <Divider className="my-6" />

      {/* Betriebs-Stammdaten */}
      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          <Building2 size={18} color="var(--accent)" />
          <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
            Betriebs-Stammdaten
          </h2>
        </div>
        <div className="space-y-3">
          <Field label="Name / Firmierung" value={settings.businessName} onChange={(v) => patch({ businessName: v })} />
          <Field label="Studio-Adresse" value={settings.address} onChange={(v) => patch({ address: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Steuernummer" value={settings.taxNumber ?? ''} onChange={(v) => patch({ taxNumber: v })} />
            <Field label="USt-IdNr" value={settings.vatId ?? ''} onChange={(v) => patch({ vatId: v })} />
          </div>
          <div>
            <label className="label">Gewerbeanmeldung (Datum)</label>
            <input
              type="date"
              className="input"
              value={settings.gewerbeStartDate ?? ''}
              onChange={(e) => patch({ gewerbeStartDate: e.target.value })}
            />
          </div>
          <Field
            label="Gesundheitsamt / Hygiene"
            value={settings.healthOfficeReg ?? ''}
            onChange={(v) => patch({ healthOfficeReg: v })}
            placeholder="Registrierung / Bemerkung"
          />
          <Field
            label="Berufshaftpflicht / Versicherung"
            value={settings.insurance ?? ''}
            onChange={(v) => patch({ insurance: v })}
            placeholder="Versicherer / Police"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Standardland</label>
              <select
                className="input"
                value={settings.defaultCountry}
                onChange={(e) => patch({ defaultCountry: e.target.value as Country })}
              >
                <option value="DE">🇩🇪 Deutschland</option>
                <option value="ES">🇪🇸 Spanien</option>
              </select>
            </div>
            <button
              type="button"
              className="mt-6 flex items-center justify-between rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--border)', borderWidth: '1.5px' }}
              onClick={() => patch({ kleinunternehmer: !settings.kleinunternehmer })}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                §19 Kleinunternehmer
              </span>
              <span
                className="relative h-6 w-11 shrink-0 rounded-full transition"
                style={{ background: settings.kleinunternehmer ? 'var(--accent)' : 'var(--surface-2)' }}
              >
                <span
                  className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ left: settings.kleinunternehmer ? 22 : 4 }}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tattoo-Statistik */}
      <div className="card mt-5">
        <h2 className="mb-3 font-semibold" style={{ color: 'var(--fg)' }}>
          Tattoo-Statistik {year}
        </h2>
        {tattoo.count === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Noch keine gewerblichen Einnahmen mit Tattoo-Details in diesem Jahr.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat label="Anzahl" value={String(tattoo.count)} />
              <MiniStat label="Ø-Dauer" value={`${(tattoo.avgDurationMin / 60).toFixed(1)} h`} />
              <MiniStat label="Gesamt" value={`${(tattoo.totalDurationMin / 60).toFixed(0)} h`} />
            </div>
            {tattoo.topMotifs.length > 0 && (
              <div className="mt-4">
                <span className="label">Beliebteste Stile</span>
                <div className="flex flex-wrap gap-2">
                  {tattoo.topMotifs.map((m) => (
                    <span key={m.motif} className="chip">
                      {m.motif} · {m.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: color }}
      />
    </div>
  )
}

function LimitBar({
  label,
  valueCents,
  limitCents,
  limitLabel,
}: {
  label: string
  valueCents: number
  limitCents: number
  limitLabel: string
}) {
  const pct = valueCents / limitCents
  const color = pct >= 1 ? 'var(--expense)' : pct >= 0.8 ? 'var(--accent)' : 'var(--income)'
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span style={{ color: 'var(--fg)' }}>{label}</span>
        <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
          {formatCents(valueCents)} / {limitLabel}
        </span>
      </div>
      <Bar pct={pct} color={color} />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
    </div>
  )
}
