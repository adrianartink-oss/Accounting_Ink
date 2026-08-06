import { describe, expect, it } from 'vitest'
import {
  KU_CURRENT_LIMIT_CENTS,
  KU_PRIOR_LIMIT_CENTS,
  kleinunternehmerStatus,
  tattooStats,
  yearlyBusinessNet,
} from './stats'
import type { Transaction } from '../db/types'

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    date: '2026-05-01',
    type: 'income',
    amountCents: 10000,
    currency: 'EUR',
    sphere: 'business',
    country: 'DE',
    categoryId: 'inc-tattoo',
    vatRateBps: null,
    description: '',
    counterparty: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...p,
  }
}

describe('kleinunternehmerStatus', () => {
  it('ok deutlich unter den Grenzen', () => {
    expect(kleinunternehmerStatus(5_000_00, 4_000_00).status).toBe('ok')
  })
  it('warn ab 80 % der laufenden Grenze', () => {
    expect(kleinunternehmerStatus(KU_CURRENT_LIMIT_CENTS * 0.85, 0).status).toBe('warn')
  })
  it('exceeded über 100k laufend', () => {
    expect(kleinunternehmerStatus(KU_CURRENT_LIMIT_CENTS + 1, 0).status).toBe('exceeded')
  })
  it('exceeded über 25k Vorjahr', () => {
    expect(kleinunternehmerStatus(1000, KU_PRIOR_LIMIT_CENTS + 1).status).toBe('exceeded')
  })
})

describe('yearlyBusinessNet', () => {
  it('summiert nur gewerbliche Einnahmen des Jahres (netto)', () => {
    const txs = [
      tx({ amountCents: 11900, vatRateBps: 1900, date: '2026-03-01' }), // netto 10000
      tx({ amountCents: 5000, sphere: 'private', date: '2026-03-01' }), // privat → ignoriert
      tx({ type: 'expense', amountCents: 9999, date: '2026-03-01' }), // Ausgabe → ignoriert
      tx({ amountCents: 20000, vatRateBps: null, date: '2025-03-01' }), // anderes Jahr
    ]
    expect(yearlyBusinessNet(txs, 2026)).toBe(10000)
  })
})

describe('tattooStats', () => {
  it('zählt, mittelt Preis/Dauer und ermittelt Top-Motive', () => {
    const txs = [
      tx({ amountCents: 10000, durationMin: 60, motif: 'Fineline' }),
      tx({ amountCents: 20000, durationMin: 120, motif: 'Fineline' }),
      tx({ amountCents: 30000, motif: 'Traditional' }),
      tx({ type: 'expense', amountCents: 5000 }), // ignoriert
    ]
    const s = tattooStats(txs, 2026)
    expect(s.count).toBe(3)
    expect(s.avgPriceCents).toBe(20000)
    expect(s.totalDurationMin).toBe(180)
    expect(s.avgDurationMin).toBe(90)
    expect(s.topMotifs[0]).toEqual({ motif: 'Fineline', count: 2 })
  })
})
