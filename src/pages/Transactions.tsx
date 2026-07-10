import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Search } from 'lucide-react'
import { useCategories, useTransactions } from '../store/hooks'
import { availableYears, filterTransactions, summarize, type TxFilter } from '../lib/euer'
import { formatSignedCents } from '../lib/money'
import PageHeader from '../components/PageHeader'
import FilterBar from '../components/FilterBar'
import TransactionRow from '../components/TransactionRow'

export default function Transactions() {
  const txs = useTransactions()
  const categories = useCategories()
  const navigate = useNavigate()
  const years = useMemo(() => availableYears(txs), [txs])
  const [filter, setFilter] = useState<TxFilter>({ country: 'ALL', sphere: 'ALL', year: 'ALL' })
  const [query, setQuery] = useState('')

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    const base = filterTransactions(txs, filter)
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter((t) => {
      const cat = catById.get(t.categoryId)
      return (
        t.counterparty.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (cat?.name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [txs, filter, query, catById])

  const summary = useMemo(() => summarize(filtered), [filtered])

  // Gruppierung nach Monat (YYYY-MM).
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const t of filtered) {
      const key = t.date.slice(0, 7)
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  return (
    <div>
      <PageHeader
        title="Buchungen"
        subtitle={`${summary.count} Einträge · Überschuss ${formatSignedCents(summary.surplusCents)}`}
        action={
          <button className="btn btn-primary" onClick={() => navigate('/add')}>
            <PlusCircle size={18} /> Neu
          </button>
        }
      />

      <div className="relative mb-4">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
          color="var(--muted)"
        />
        <input
          className="input pl-11"
          placeholder="Suchen (Kunde, Händler, Beschreibung)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <FilterBar filter={filter} onChange={(p) => setFilter((f) => ({ ...f, ...p }))} years={years} />

      {groups.length === 0 ? (
        <div className="card text-center" style={{ color: 'var(--muted)' }}>
          Keine Buchungen gefunden.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([monthKey, list]) => (
            <div key={monthKey}>
              <h3
                className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide"
                style={{ color: 'var(--muted)' }}
              >
                {formatMonth(monthKey)}
              </h3>
              <div className="card !p-1.5">
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {list.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} category={catById.get(tx.categoryId)} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function formatMonth(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[Number.parseInt(m, 10) - 1]} ${y}`
}
