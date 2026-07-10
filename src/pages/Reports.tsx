import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { useCategories, useSettings, useTransactions } from '../store/hooks'
import {
  availableYears,
  filterTransactions,
  groupByCategory,
  summarize,
  type TxFilter,
} from '../lib/euer'
import { formatCents, formatSignedCents } from '../lib/money'
import { downloadBlob, transactionsToCsv } from '../lib/export'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'

export default function Reports() {
  const txs = useTransactions()
  const categories = useCategories()
  const settings = useSettings()
  const years = useMemo(() => availableYears(txs), [txs])
  const [filter, setFilter] = useState<TxFilter>({
    country: 'ALL',
    sphere: 'business',
    year: new Date().getFullYear(),
  })

  const filtered = useMemo(() => filterTransactions(txs, filter), [txs, filter])
  const summary = useMemo(() => summarize(filtered), [filtered])
  const incomeLines = useMemo(
    () => groupByCategory(filtered, categories, 'income'),
    [filtered, categories],
  )
  const expenseLines = useMemo(
    () => groupByCategory(filtered, categories, 'expense'),
    [filtered, categories],
  )

  function handleCsv() {
    const csv = transactionsToCsv(filtered, categories)
    const scope = [
      filter.year === 'ALL' ? 'alle' : filter.year,
      filter.country === 'ALL' ? 'DE-ES' : filter.country,
    ].join('_')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `euer_${scope}.csv`)
  }

  return (
    <div>
      <PageHeader
        title="Berichte / EÜR"
        subtitle="Einnahmen-Überschuss-Rechnung nach Land & Zeitraum"
        action={
          <div className="flex gap-2">
            <button className="btn" onClick={() => window.print()} title="Als PDF drucken">
              <Printer size={18} />
            </button>
            <button className="btn btn-primary" onClick={handleCsv} disabled={filtered.length === 0}>
              <Download size={18} /> CSV
            </button>
          </div>
        }
      />

      <div className="no-print">
        <FilterBar filter={filter} onChange={(p) => setFilter((f) => ({ ...f, ...p }))} years={years} />
      </div>

      <div className="print-area">
        {/* Kopf für Druck/PDF */}
        <div className="card mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                Einnahmen-Überschuss-Rechnung
              </div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {settings.businessName || 'Einzelunternehmen'} ·{' '}
                {filter.year === 'ALL' ? 'Alle Jahre' : filter.year} ·{' '}
                {filter.country === 'ALL' ? 'DE + ES' : filter.country} ·{' '}
                {filter.sphere === 'business'
                  ? 'Gewerblich'
                  : filter.sphere === 'private'
                    ? 'Privat'
                    : 'Alle Sphären'}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <SumBox label="Einnahmen" value={formatCents(summary.incomeCents)} color="var(--income)" />
            <SumBox label="Ausgaben" value={formatCents(summary.expenseCents)} color="var(--expense)" />
            <SumBox
              label="Überschuss"
              value={formatSignedCents(summary.surplusCents)}
              color={summary.surplusCents >= 0 ? 'var(--income)' : 'var(--expense)'}
            />
          </div>
        </div>

        <ReportTable title="Einnahmen" lines={incomeLines} total={summary.incomeCents} />
        <ReportTable title="Ausgaben" lines={expenseLines} total={summary.expenseCents} />

        {settings.kleinunternehmer && (
          <p className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
            Hinweis: Kleinunternehmer nach §19 UStG – Beträge ohne gesonderten
            Umsatzsteuerausweis.
          </p>
        )}
      </div>
    </div>
  )
}

function SumBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function ReportTable({
  title,
  lines,
  total,
}: {
  title: string
  lines: ReturnType<typeof groupByCategory>
  total: number
}) {
  return (
    <div className="card mb-4">
      <h2 className="mb-3 font-semibold" style={{ color: 'var(--fg)' }}>
        {title}
      </h2>
      {lines.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Keine Buchungen.
        </p>
      ) : (
        <div>
          {lines.map((line) => (
            <div
              key={line.categoryId}
              className="flex items-center justify-between border-b py-2 text-sm last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: line.color }}
                />
                {line.categoryName}
                {line.skr03Code && (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    · {line.skr03Code}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  ({line.count})
                </span>
              </span>
              <span className="tabular-nums font-medium" style={{ color: 'var(--fg)' }}>
                {formatCents(line.amountCents)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 font-semibold">
            <span style={{ color: 'var(--fg)' }}>Summe {title}</span>
            <span className="tabular-nums" style={{ color: 'var(--fg)' }}>
              {formatCents(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
