import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, PlusCircle, ScanLine, Scale } from 'lucide-react'
import { useCategories, useTransactions } from '../store/hooks'
import {
  availableYears,
  filterTransactions,
  groupByCategory,
  groupByMonth,
  summarize,
  type TxFilter,
} from '../lib/euer'
import { formatCents, formatSignedCents } from '../lib/money'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'
import StatTile from '../components/StatTile'
import CategoryIcon from '../components/CategoryIcon'

export default function Dashboard() {
  const txs = useTransactions()
  const categories = useCategories()
  const navigate = useNavigate()
  const years = useMemo(() => availableYears(txs), [txs])
  const [filter, setFilter] = useState<TxFilter>({
    country: 'ALL',
    sphere: 'ALL',
    year: new Date().getFullYear(),
  })

  const filtered = useMemo(() => filterTransactions(txs, filter), [txs, filter])
  const summary = useMemo(() => summarize(filtered), [filtered])

  const chartYear =
    typeof filter.year === 'number' ? filter.year : (years[0] ?? new Date().getFullYear())
  const monthly = useMemo(
    () =>
      groupByMonth(
        filterTransactions(txs, { ...filter, year: chartYear }),
        chartYear,
      ).map((m) => ({
        label: m.label,
        Einnahmen: m.incomeCents / 100,
        Ausgaben: m.expenseCents / 100,
      })),
    [txs, filter, chartYear],
  )

  // Länder-Aufteilung (Überschuss), unabhängig vom Länderfilter.
  const perCountry = useMemo(() => {
    const base = filterTransactions(txs, { ...filter, country: 'ALL' })
    return (['DE', 'ES'] as const).map((c) => ({
      country: c,
      ...summarize(base.filter((t) => t.country === c)),
    }))
  }, [txs, filter])

  const topExpenses = useMemo(
    () => groupByCategory(filtered, categories, 'expense').slice(0, 5),
    [filtered, categories],
  )
  const maxExpense = topExpenses[0]?.amountCents ?? 1

  return (
    <div>
      <PageHeader
        title="Übersicht"
        subtitle="Einnahmen, Ausgaben und Überschuss auf einen Blick"
      />

      <FilterBar filter={filter} onChange={(p) => setFilter((f) => ({ ...f, ...p }))} years={years} />

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Einnahmen"
          value={formatCents(summary.incomeCents)}
          accent="var(--income)"
          icon={<ArrowUpRight size={18} color="var(--income)" />}
        />
        <StatTile
          label="Ausgaben"
          value={formatCents(summary.expenseCents)}
          accent="var(--expense)"
          icon={<ArrowDownRight size={18} color="var(--expense)" />}
        />
        <StatTile
          label="Überschuss (EÜR)"
          value={formatSignedCents(summary.surplusCents)}
          accent={summary.surplusCents >= 0 ? 'var(--income)' : 'var(--expense)'}
          icon={<Scale size={18} color="var(--accent)" />}
          hint={`${summary.count} Buchungen`}
        />
      </div>

      {/* Schnellaktionen */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button className="btn" onClick={() => navigate('/add')}>
          <PlusCircle size={18} color="var(--accent)" /> Buchung erfassen
        </button>
        <button className="btn" onClick={() => navigate('/scan')}>
          <ScanLine size={18} color="var(--accent)" /> Beleg scannen
        </button>
      </div>

      {/* Monatsverlauf */}
      <div className="card mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
            Monatsverlauf {chartYear}
          </h2>
        </div>
        {summary.count === 0 ? (
          <EmptyChart />
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--muted) 12%, transparent)' }} />
                <Bar dataKey="Einnahmen" fill="var(--income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ausgaben" fill="var(--expense)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Länder-Aufteilung */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {perCountry.map((c) => (
          <div key={c.country} className="card !p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                {c.country === 'DE' ? '🇩🇪 Deutschland' : '🇪🇸 Spanien'}
              </span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: c.surplusCents >= 0 ? 'var(--income)' : 'var(--expense)' }}
              >
                {formatSignedCents(c.surplusCents)}
              </span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
              <span>Ein: {formatCents(c.incomeCents)}</span>
              <span>Aus: {formatCents(c.expenseCents)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top-Ausgaben */}
      {topExpenses.length > 0 && (
        <div className="card mt-5">
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--fg)' }}>
            Größte Ausgaben
          </h2>
          <div className="space-y-3">
            {topExpenses.map((line) => (
              <div key={line.categoryId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                    <CategoryIcon
                      name={categories.find((c) => c.id === line.categoryId)?.icon ?? 'Tag'}
                      size={16}
                      color={line.color}
                    />
                    {line.categoryName}
                  </span>
                  <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
                    {formatCents(line.amountCents)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(line.amountCents / maxExpense) * 100}%`,
                      background: line.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyChart() {
  return (
    <div
      className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm"
      style={{ color: 'var(--muted)' }}
    >
      <span>Noch keine Buchungen in diesem Zeitraum.</span>
      <span>Erfasse deine erste Buchung, um Auswertungen zu sehen.</span>
    </div>
  )
}

interface TooltipEntry {
  name: string
  value: number
  color: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
    >
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="tabular-nums">
            {formatCents(Math.round(entry.value * 100))}
          </span>
        </div>
      ))}
    </div>
  )
}
