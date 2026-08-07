// Leichtgewichtiger Locale-Halter – bewusst OHNE i18next-Abhängigkeit, damit
// Formatierungs-Helfer (money.ts) ihn nutzen können, ohne in der Node-Test-
// umgebung den Sprach-Detektor (localStorage/navigator) zu laden.
// i18n/index.ts hält diesen Wert bei jedem Sprachwechsel aktuell.

let current = 'de'

/** Setzt die aktive BCP-47-Sprache (z. B. 'de', 'en', 'es'). */
export function setLocale(locale: string): void {
  current = locale || 'de'
}

/** Aktive Sprache für Intl-Formatierung (Zahlen, Datum). */
export function getLocale(): string {
  return current
}
