import type { Country, Transaction } from '../db/types'
import { EU_COUNTRIES, countryInfo } from './countries'

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

/** Formatiert Basispunkte als Prozent-Label, z. B. 2550 → „25,5 %". */
function vatLabel(bps: number): string {
  return `${(bps / 100).toLocaleString('de-DE')} %`
}

/**
 * Länderabhängige USt-/MwSt-Sätze, abgeleitet aus der EU-Länder-Registry:
 * Standardsatz, ermäßigte Sätze und 0 %.
 */
export const VAT_RATES: Record<Country, VatRateOption[]> = Object.fromEntries(
  EU_COUNTRIES.map((c) => [
    c.code,
    [c.standardVatBps, ...c.reducedVatBps, 0].map((bps) => ({ label: vatLabel(bps), bps })),
  ]),
) as Record<Country, VatRateOption[]>

/** Standard-USt-Satz je Land (für neue Regelbesteuerungs-Buchungen). */
export function defaultVatBps(country: Country): number {
  return countryInfo(country)?.standardVatBps ?? 1900
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
