import type { Country, Currency } from '../db/types'

/**
 * Stammdaten eines EU-Landes für die Buchhaltung.
 *
 * USt-/MwSt-Sätze sind die jeweiligen Standard- und ermäßigten Sätze (in
 * Basispunkten, z. B. 1900 = 19 %). Steuersätze ändern sich – bitte im
 * Zweifel den aktuell gültigen Satz prüfen; sie dienen hier nur als Vorauswahl.
 */
export interface CountryInfo {
  /** ISO-3166-1 alpha-2 Code. */
  code: Country
  /** Deutscher Ländername. */
  name: string
  /** Flaggen-Emoji. */
  flag: string
  /** Landeswährung (ISO-4217). */
  currency: Currency
  /** Standard-USt-/MwSt-Satz in Basispunkten. */
  standardVatBps: number
  /** Ermäßigte Sätze in Basispunkten (ohne 0 %), höchster zuerst. */
  reducedVatBps: number[]
}

/**
 * Alle 27 EU-Länder. Deutschland und Spanien stehen bewusst vorne (Haupt-
 * Länder dieser App), danach alphabetisch nach deutschem Namen.
 *
 * Hinweis Euro-Raum: Bulgarien führt den Euro zum 01.01.2026 ein und ist hier
 * bereits mit EUR hinterlegt. Nicht dem Euro-Raum gehören CZ, DK, HU, PL, RO
 * und SE an.
 */
export const EU_COUNTRIES: CountryInfo[] = [
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', currency: 'EUR', standardVatBps: 1900, reducedVatBps: [700] },
  { code: 'ES', name: 'Spanien', flag: '🇪🇸', currency: 'EUR', standardVatBps: 2100, reducedVatBps: [1000, 400] },
  { code: 'BE', name: 'Belgien', flag: '🇧🇪', currency: 'EUR', standardVatBps: 2100, reducedVatBps: [1200, 600] },
  { code: 'BG', name: 'Bulgarien', flag: '🇧🇬', currency: 'EUR', standardVatBps: 2000, reducedVatBps: [900] },
  { code: 'DK', name: 'Dänemark', flag: '🇩🇰', currency: 'DKK', standardVatBps: 2500, reducedVatBps: [] },
  { code: 'EE', name: 'Estland', flag: '🇪🇪', currency: 'EUR', standardVatBps: 2400, reducedVatBps: [900] },
  { code: 'FI', name: 'Finnland', flag: '🇫🇮', currency: 'EUR', standardVatBps: 2550, reducedVatBps: [1400, 1000] },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷', currency: 'EUR', standardVatBps: 2000, reducedVatBps: [1000, 550, 210] },
  { code: 'GR', name: 'Griechenland', flag: '🇬🇷', currency: 'EUR', standardVatBps: 2400, reducedVatBps: [1300, 600] },
  { code: 'IE', name: 'Irland', flag: '🇮🇪', currency: 'EUR', standardVatBps: 2300, reducedVatBps: [1350, 900] },
  { code: 'IT', name: 'Italien', flag: '🇮🇹', currency: 'EUR', standardVatBps: 2200, reducedVatBps: [1000, 500, 400] },
  { code: 'HR', name: 'Kroatien', flag: '🇭🇷', currency: 'EUR', standardVatBps: 2500, reducedVatBps: [1300, 500] },
  { code: 'LV', name: 'Lettland', flag: '🇱🇻', currency: 'EUR', standardVatBps: 2100, reducedVatBps: [1200, 500] },
  { code: 'LT', name: 'Litauen', flag: '🇱🇹', currency: 'EUR', standardVatBps: 2100, reducedVatBps: [900, 500] },
  { code: 'LU', name: 'Luxemburg', flag: '🇱🇺', currency: 'EUR', standardVatBps: 1700, reducedVatBps: [1400, 800, 300] },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', currency: 'EUR', standardVatBps: 1800, reducedVatBps: [700, 500] },
  { code: 'NL', name: 'Niederlande', flag: '🇳🇱', currency: 'EUR', standardVatBps: 2100, reducedVatBps: [900] },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', currency: 'EUR', standardVatBps: 2000, reducedVatBps: [1300, 1000] },
  { code: 'PL', name: 'Polen', flag: '🇵🇱', currency: 'PLN', standardVatBps: 2300, reducedVatBps: [800, 500] },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', standardVatBps: 2300, reducedVatBps: [1300, 600] },
  { code: 'RO', name: 'Rumänien', flag: '🇷🇴', currency: 'RON', standardVatBps: 2100, reducedVatBps: [1100] },
  { code: 'SE', name: 'Schweden', flag: '🇸🇪', currency: 'SEK', standardVatBps: 2500, reducedVatBps: [1200, 600] },
  { code: 'SK', name: 'Slowakei', flag: '🇸🇰', currency: 'EUR', standardVatBps: 2300, reducedVatBps: [1900, 500] },
  { code: 'SI', name: 'Slowenien', flag: '🇸🇮', currency: 'EUR', standardVatBps: 2200, reducedVatBps: [950, 500] },
  { code: 'CZ', name: 'Tschechien', flag: '🇨🇿', currency: 'CZK', standardVatBps: 2100, reducedVatBps: [1200] },
  { code: 'HU', name: 'Ungarn', flag: '🇭🇺', currency: 'HUF', standardVatBps: 2700, reducedVatBps: [1800, 500] },
  { code: 'CY', name: 'Zypern', flag: '🇨🇾', currency: 'EUR', standardVatBps: 1900, reducedVatBps: [900, 500] },
]

const COUNTRY_MAP = new Map<Country, CountryInfo>(EU_COUNTRIES.map((c) => [c.code, c]))

/** Alle Länder-Codes in Anzeigereihenfolge. */
export const COUNTRY_CODES: Country[] = EU_COUNTRIES.map((c) => c.code)

/** Stammdaten zu einem Länder-Code (undefined bei Unbekanntem). */
export function countryInfo(code: Country): CountryInfo | undefined {
  return COUNTRY_MAP.get(code)
}

/** Prüft, ob ein String ein bekannter EU-Länder-Code ist. */
export function isCountry(code: string): code is Country {
  return COUNTRY_MAP.has(code as Country)
}

/** Anzeigelabel „🇩🇪 Deutschland" (fällt auf den Code zurück). */
export function countryLabel(code: Country): string {
  const info = COUNTRY_MAP.get(code)
  return info ? `${info.flag} ${info.name}` : code
}

/** Kurzlabel „🇩🇪 DE" für enge Layouts. */
export function countryShortLabel(code: Country): string {
  const info = COUNTRY_MAP.get(code)
  return info ? `${info.flag} ${info.code}` : code
}

/** Währung des Landes (Fallback EUR). */
export function currencyForCountry(code: Country): Currency {
  return COUNTRY_MAP.get(code)?.currency ?? 'EUR'
}
