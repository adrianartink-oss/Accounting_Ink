import type { Currency } from '../db/types'

/** Formatiert Cent-Beträge als lokalisierte Währung (de-DE). */
export function formatCents(amountCents: number, currency: Currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amountCents / 100)
}

/** Formatiert Cent-Beträge mit explizitem Vorzeichen (+/−). */
export function formatSignedCents(
  amountCents: number,
  currency: Currency = 'EUR',
): string {
  const sign = amountCents > 0 ? '+' : amountCents < 0 ? '−' : ''
  return `${sign}${formatCents(Math.abs(amountCents), currency)}`
}

/**
 * Parst eine Nutzereingabe (z. B. "42,50", "1.234,56", "42.50") zu Cent.
 * Gibt null zurück, wenn kein gültiger Betrag erkannt wird.
 */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let normalized = trimmed.replace(/[^\d.,-]/g, '')
  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')

  if (hasComma && hasDot) {
    // Letztes Trennzeichen ist das Dezimaltrennzeichen.
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }

  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) return null
  return Math.round(value * 100)
}

/** Wandelt Cent in einen editierbaren de-DE-String (ohne Währungssymbol). */
export function centsToInputString(amountCents: number): string {
  return (amountCents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  })
}
