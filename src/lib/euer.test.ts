import { describe, expect, it } from 'vitest'
import {
  availableYears,
  filterTransactions,
  groupByCategory,
  groupByMonth,
  matchesFilter,
  summarize,
} from './euer'
import type { Category, Transaction } from '../db/types'

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    date: '2026-05-01',
    type: 'expense',
    amountCents: 1000,
    currency: 'EUR',
    sphere: 'business',
    country: 'DE',
    categoryId: 'exp-rent',
    vatRateBps: null,
    description: '',
    counterparty: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  }
}

const sample: Transaction[] = [
  tx({ type: 'income', amountCents: 20000, country: 'ES', date: '2026-03-10', categoryId: 'inc-tattoo' }),
  tx({ type: 'expense', amountCents: 4250, country: 'DE', date: '2026-07-02', categoryId: 'exp-supplies' }),
  tx({ type: 'expense', amountCents: 1000, country: 'DE', date: '2025-07-02', categoryId: 'exp-rent' }),
]

const cats: Category[] = [
  { id: 'inc-tattoo', name: 'Tattoo', kind: 'income', sphere: 'business', color: '#000', icon: 'Feather' },
  { id: 'exp-supplies', name: 'Wareneinkauf', kind: 'expense', sphere: 'business', color: '#000', icon: 'Syringe' },
  { id: 'exp-rent', name: 'Miete', kind: 'expense', sphere: 'business', color: '#000', icon: 'Building2' },
]

describe('summarize', () => {
  it('summiert Einnahmen, Ausgaben und Überschuss', () => {
    const s = summarize(sample)
    expect(s.incomeCents).toBe(20000)
    expect(s.expenseCents).toBe(5250)
    expect(s.surplusCents).toBe(14750)
    expect(s.count).toBe(3)
  })
})

describe('matchesFilter', () => {
  it('filtert nach Land', () => {
    expect(matchesFilter(sample[0], { country: 'ES' })).toBe(true)
    expect(matchesFilter(sample[0], { country: 'DE' })).toBe(false)
  })
  it('filtert nach Jahr', () => {
    expect(matchesFilter(sample[2], { year: 2025 })).toBe(true)
    expect(matchesFilter(sample[2], { year: 2026 })).toBe(false)
  })
  it('ALL matcht alles', () => {
    expect(matchesFilter(sample[0], { country: 'ALL', sphere: 'ALL', year: 'ALL' })).toBe(true)
  })
})

describe('filterTransactions', () => {
  it('kombiniert Land und Jahr', () => {
    const out = filterTransactions(sample, { country: 'DE', year: 2026 })
    expect(out).toHaveLength(1)
    expect(out[0].amountCents).toBe(4250)
  })
})

describe('groupByCategory', () => {
  it('gruppiert Ausgaben absteigend nach Betrag', () => {
    const lines = groupByCategory(sample, cats, 'expense')
    expect(lines[0].categoryName).toBe('Wareneinkauf')
    expect(lines[0].amountCents).toBe(4250)
    expect(lines).toHaveLength(2)
  })
})

describe('groupByMonth', () => {
  it('legt Beträge auf den richtigen Monat', () => {
    const points = groupByMonth(sample, 2026)
    expect(points[2].incomeCents).toBe(20000) // März
    expect(points[6].expenseCents).toBe(4250) // Juli
    expect(points[6].surplusCents).toBe(-4250)
  })
})

describe('availableYears', () => {
  it('liefert Jahre absteigend inkl. aktuellem Jahr', () => {
    const years = availableYears(sample)
    expect(years).toContain(2026)
    expect(years).toContain(2025)
    expect(years[0]).toBeGreaterThanOrEqual(years[years.length - 1])
  })
})

describe('Regression: gescannte Belege & Jahresfilter', () => {
  it('summarize zählt gescannte Buchungen (source: "ai") mit', () => {
    const txs = [
      tx({ type: 'income', amountCents: 5000, source: 'manual' }),
      tx({ type: 'expense', amountCents: 2000, source: 'ai' }),
    ]
    const s = summarize(txs)
    expect(s.incomeCents).toBe(5000)
    expect(s.expenseCents).toBe(2000)
    expect(s.count).toBe(2)
  })

  it('year "ALL" bezieht Buchungen aus verschiedenen Jahren ein', () => {
    const txs = [
      tx({ amountCents: 1000, date: '2024-02-01' }),
      tx({ amountCents: 1000, date: '2025-02-01', source: 'ai' }),
      tx({ amountCents: 1000, date: '2026-02-01' }),
    ]
    const all = filterTransactions(txs, { country: 'ALL', sphere: 'ALL', year: 'ALL' })
    expect(all).toHaveLength(3)
    // Ein konkretes Jahr grenzt weiterhin korrekt ein.
    expect(filterTransactions(txs, { year: 2025 })).toHaveLength(1)
  })
})
