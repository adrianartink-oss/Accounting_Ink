import type { Transaction } from '../db/types'
import { filterTransactions } from './euer'
import { splitGross } from './vat'

/** Kleinunternehmer-Grenzen (§19 UStG, netto, Stand 2025/2026). */
export const KU_PRIOR_LIMIT_CENTS = 25_000_00 // Vorjahr
export const KU_CURRENT_LIMIT_CENTS = 100_000_00 // laufendes Jahr

/** Gewerbliche Einnahmen eines Jahres (Buchungen). */
export function businessIncome(txs: Transaction[], year: number): Transaction[] {
  return filterTransactions(txs, { sphere: 'business', year }).filter(
    (t) => t.type === 'income',
  )
}

/** Netto-Geschäftseinnahmen eines Jahres in Cent (bei §19 = Brutto). */
export function yearlyBusinessNet(txs: Transaction[], year: number): number {
  return businessIncome(txs, year).reduce(
    (sum, t) => sum + splitGross(t.amountCents, t.vatRateBps).netCents,
    0,
  )
}

export type KuStatus = 'ok' | 'warn' | 'exceeded'

export interface KleinunternehmerInfo {
  currentNetCents: number
  priorNetCents: number
  currentPct: number
  priorPct: number
  status: KuStatus
  message: string
}

/**
 * Bewertet die Kleinunternehmer-Grenzen: laufendes Jahr gegen 100.000 €,
 * Vorjahr gegen 25.000 €. Warnung ab 80 % der jeweiligen Grenze.
 */
export function kleinunternehmerStatus(
  currentNetCents: number,
  priorNetCents: number,
): KleinunternehmerInfo {
  const currentPct = currentNetCents / KU_CURRENT_LIMIT_CENTS
  const priorPct = priorNetCents / KU_PRIOR_LIMIT_CENTS

  let status: KuStatus = 'ok'
  let message = 'Kleinunternehmer-Regelung anwendbar.'

  if (currentNetCents > KU_CURRENT_LIMIT_CENTS) {
    status = 'exceeded'
    message = '100.000-€-Grenze im laufenden Jahr überschritten – §19 endet ab dieser Buchung.'
  } else if (priorNetCents > KU_PRIOR_LIMIT_CENTS) {
    status = 'exceeded'
    message = 'Vorjahr über 25.000 € – dieses Jahr Regelbesteuerung statt §19.'
  } else if (currentPct >= 0.8 || priorPct >= 0.8) {
    status = 'warn'
    message = 'Nahe an der Kleinunternehmer-Grenze – im Blick behalten.'
  }

  return { currentNetCents, priorNetCents, currentPct, priorPct, status, message }
}

/** Aggregierte Tattoo-Kennzahlen. */
export interface TattooStats {
  /** Anzahl gewerblicher Einnahmen (≈ Tattoos/Sessions). */
  count: number
  totalDurationMin: number
  /** Ø-Dauer über Buchungen mit Dauerangabe. */
  avgDurationMin: number
  /** Ø-Preis (brutto) je Einnahme. */
  avgPriceCents: number
  /** Häufigste Motive/Stile, absteigend. */
  topMotifs: { motif: string; count: number }[]
}

/** Tattoo-Statistik aus den gewerblichen Einnahmen eines Jahres. */
export function tattooStats(txs: Transaction[], year: number): TattooStats {
  const income = businessIncome(txs, year)
  const count = income.length
  const totalAmount = income.reduce((s, t) => s + t.amountCents, 0)

  const withDuration = income.filter((t) => t.durationMin && t.durationMin > 0)
  const totalDurationMin = withDuration.reduce((s, t) => s + (t.durationMin ?? 0), 0)

  const motifCounts = new Map<string, number>()
  for (const t of income) {
    const m = t.motif?.trim()
    if (m) motifCounts.set(m, (motifCounts.get(m) ?? 0) + 1)
  }
  const topMotifs = [...motifCounts.entries()]
    .map(([motif, c]) => ({ motif, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    count,
    totalDurationMin,
    avgDurationMin: withDuration.length ? Math.round(totalDurationMin / withDuration.length) : 0,
    avgPriceCents: count ? Math.round(totalAmount / count) : 0,
    topMotifs,
  }
}
