import { describe, expect, it } from 'vitest'
import { defaultVatBps, splitGross, vatSummary } from './vat'
import type { Transaction } from '../db/types'

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 'x',
    date: '2026-05-01',
    type: 'expense',
    amountCents: 0,
    currency: 'EUR',
    sphere: 'business',
    country: 'DE',
    categoryId: 'c',
    vatRateBps: null,
    description: '',
    counterparty: '',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  }
}

describe('splitGross', () => {
  it('teilt Brutto bei 19 % korrekt', () => {
    const r = splitGross(11900, 1900)
    expect(r.netCents).toBe(10000)
    expect(r.vatCents).toBe(1900)
  })
  it('behandelt Kleinunternehmer (null) als Netto = Brutto', () => {
    const r = splitGross(1000, null)
    expect(r.netCents).toBe(1000)
    expect(r.vatCents).toBe(0)
  })
})

describe('defaultVatBps', () => {
  it('19 % für DE, 21 % für ES', () => {
    expect(defaultVatBps('DE')).toBe(1900)
    expect(defaultVatBps('ES')).toBe(2100)
  })
})

describe('vatSummary', () => {
  it('berechnet Zahllast (USt − Vorsteuer)', () => {
    const txs = [
      tx({ type: 'income', amountCents: 11900, vatRateBps: 1900 }), // USt 1900
      tx({ type: 'expense', amountCents: 1190, vatRateBps: 1900 }), // Vorsteuer 190
    ]
    const s = vatSummary(txs)
    expect(s.outputVatCents).toBe(1900)
    expect(s.inputVatCents).toBe(190)
    expect(s.payableCents).toBe(1710)
    expect(s.netIncomeCents).toBe(10000)
    expect(s.netExpenseCents).toBe(1000)
  })
})
