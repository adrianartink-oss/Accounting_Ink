import type { Country, Transaction } from '../db/types'

/** Netto/USt-Aufteilung eines Bruttobetrags. */
export interface VatSplit {
  grossCents: number
  netCents: number
  vatCents: number
  rateBps: number
}

/**
 * Teilt einen Bruttobetrag anhand des USt-Satzes (Basispunkte) in Netto und
 * USt. Bei rateBps null/0 ist Netto = Brutto (Kleinunternehmer).
 */
export function splitGross(grossCents: number, rateBps: number | null): VatSplit {
  const bps = rateBps ?? 0
  if (bps <= 0) {
    return { grossCents, netCents: grossCents, vatCents: 0, rateBps: 0 }
  }
  const netCents = Math.round((grossCents * 10000) / (10000 + bps))
  return { grossCents, netCents, vatCents: grossCents - netCents, rateBps: bps }
}

/** Auswählbarer USt-Satz. */
export interface VatRateOption {
  label: string
  bps: number
}

/** Länderabhängige USt-Sätze (DE: 19/7/0, ES/IVA: 21/10/4/0). */
export const VAT_RATES: Record<Country, VatRateOption[]> = {
  DE: [
    { label: '19 %', bps: 1900 },
    { label: '7 %', bps: 700 },
    { label: '0 %', bps: 0 },
  ],
  ES: [
    { label: '21 %', bps: 2100 },
    { label: '10 %', bps: 1000 },
    { label: '4 %', bps: 400 },
    { label: '0 %', bps: 0 },
  ],
}

/** Standard-USt-Satz je Land (für neue Regelbesteuerungs-Buchungen). */
export function defaultVatBps(country: Country): number {
  return country === 'ES' ? 2100 : 1900
}

/** USt-Kennzahlen für die Umsatzsteuer-Voranmeldung. */
export interface VatSummary {
  /** USt auf Einnahmen (Umsatzsteuer / IVA repercutido). */
  outputVatCents: number
  /** USt auf Ausgaben (Vorsteuer / IVA soportado). */
  inputVatCents: number
  /** Zahllast = Umsatzsteuer − Vorsteuer. */
  payableCents: number
  /** Netto-Einnahmen / Netto-Ausgaben. */
  netIncomeCents: number
  netExpenseCents: number
}

/** Aggregiert USt/Vorsteuer und Netto-Summen über eine Buchungsliste. */
export function vatSummary(txs: Transaction[]): VatSummary {
  let outputVatCents = 0
  let inputVatCents = 0
  let netIncomeCents = 0
  let netExpenseCents = 0
  for (const tx of txs) {
    const split = splitGross(tx.amountCents, tx.vatRateBps)
    if (tx.type === 'income') {
      outputVatCents += split.vatCents
      netIncomeCents += split.netCents
    } else {
      inputVatCents += split.vatCents
      netExpenseCents += split.netCents
    }
  }
  return {
    outputVatCents,
    inputVatCents,
    payableCents: outputVatCents - inputVatCents,
    netIncomeCents,
    netExpenseCents,
  }
}
