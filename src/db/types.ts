// Gemeinsame Domänen-Typen für die Buchhaltung.

/** Buchungsart. */
export type TxType = 'income' | 'expense'

/** Sphäre: gewerblich oder privat. */
export type Sphere = 'business' | 'private'

/**
 * Land der Buchung (ISO-3166-1 alpha-2). Unterstützt werden alle 27 EU-Länder.
 * Die zugehörigen Stammdaten (Name, Flagge, Währung, USt-Sätze) liegen zentral
 * in `src/lib/countries.ts`.
 */
export type Country =
  | 'AT'
  | 'BE'
  | 'BG'
  | 'HR'
  | 'CY'
  | 'CZ'
  | 'DK'
  | 'EE'
  | 'FI'
  | 'FR'
  | 'DE'
  | 'GR'
  | 'HU'
  | 'IE'
  | 'IT'
  | 'LV'
  | 'LT'
  | 'LU'
  | 'MT'
  | 'NL'
  | 'PL'
  | 'PT'
  | 'RO'
  | 'SK'
  | 'SI'
  | 'ES'
  | 'SE'

/** Herkunft eines Datensatzes. */
export type TxSource = 'manual' | 'ai' | 'recurring'

/**
 * Unterstützte Währungen (ISO-4217). Euro plus die Landeswährungen der
 * EU-Länder, die (noch) nicht dem Euro-Raum angehören.
 */
export type Currency = 'EUR' | 'CZK' | 'DKK' | 'HUF' | 'PLN' | 'RON' | 'SEK'

/**
 * Eine einzelne Buchung (Einnahme oder Ausgabe).
 * Beträge werden als ganzzahlige Cent gespeichert, um Float-Rundungsfehler
 * zu vermeiden. `vatRateBps` (Basispunkte, z. B. 1900 = 19 %) bleibt für die
 * spätere Umstellung von Kleinunternehmer (§19) auf Regelbesteuerung
 * vorhanden, ist bei Kleinunternehmern aber `null`.
 */
export interface Transaction {
  id: string
  /** ISO-Datum YYYY-MM-DD. */
  date: string
  type: TxType
  /** Betrag in Cent (immer positiv; Vorzeichen ergibt sich aus `type`). */
  amountCents: number
  currency: Currency
  sphere: Sphere
  country: Country
  categoryId: string
  /** USt-Satz in Basispunkten oder null (Kleinunternehmer). */
  vatRateBps: number | null
  /** Freitext / Verwendungszweck. */
  description: string
  /** Geschäftspartner / Lieferant / Kunde. */
  counterparty: string
  /** Referenz auf einen hinterlegten Beleg, falls vorhanden. */
  receiptId?: string
  source: TxSource
  // ── Optionale Tattoo-Details (nur bei gewerblichen Einnahmen sinnvoll) ──
  /** Motiv / Stil (z. B. „Fineline", „Traditional"). */
  motif?: string
  /** Körperstelle (z. B. „Unterarm"). */
  bodyPart?: string
  /** Größe als Freitext (z. B. „12×8 cm"). */
  sizeText?: string
  /** Arbeitsdauer in Minuten. */
  durationMin?: number
  /** Epoch-Millisekunden. */
  createdAt: number
  updatedAt: number
}

/** Kategorie (Kontenrahmen-orientiert, SKR03). */
export interface Category {
  id: string
  name: string
  kind: TxType
  sphere: Sphere
  /** SKR03-Kontonummer (informativ). */
  skr03Code?: string
  /** Tailwind-kompatible Akzentfarbe (HEX). */
  color: string
  /** lucide-react Icon-Name. */
  icon: string
  /** Sortierreihenfolge in Auswahllisten (kleiner = weiter oben). */
  sortOrder?: number
  /** Vom Nutzer angelegt (nicht aus dem Seed). */
  custom?: boolean
}

/** Belegbild inkl. Vorschau. */
export interface Receipt {
  id: string
  /** Original-Bild als Blob. */
  blob: Blob
  /** Kleine Vorschau als Data-URL. */
  thumbnail: string
  transactionId?: string
  createdAt: number
}

/** Intervall für wiederkehrende Buchungen. */
export type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/**
 * Vorlage für eine wiederkehrende Buchung. Beim App-Start werden alle fälligen
 * Buchungen bis zum heutigen Tag erzeugt und `nextDate` weitergeschaltet.
 */
export interface RecurringRule {
  id: string
  active: boolean
  interval: RecurringInterval
  // Vorlage
  type: TxType
  sphere: Sphere
  country: Country
  categoryId: string
  amountCents: number
  currency: Currency
  vatRateBps: number | null
  counterparty: string
  description: string
  // Terminierung
  startDate: string
  nextDate: string
  endDate?: string
  createdAt: number
}

/** Verfügbare Claude-Modelle für die KI-Funktionen. */
export type AiModel = 'claude-opus-4-8' | 'claude-haiku-4-5'

/** Einstellungen (genau ein Datensatz, id === 'singleton'). */
export interface Settings {
  id: 'singleton'
  /** Kleinunternehmer nach §19 UStG (keine USt). */
  kleinunternehmer: boolean
  defaultCountry: Country
  businessName: string
  address: string
  /** Verschlüsselter Anthropic-API-Key (AES-GCM, base64). */
  apiKeyEncrypted?: string
  aiModel: AiModel
  disclaimerAccepted: boolean
  /** Erst-Start-Onboarding abgeschlossen (lokal, Backup, App-Sperre). */
  onboardingDone?: boolean
  /** Farbschema. */
  theme: 'system' | 'light' | 'dark'
  /** Zeitpunkt des letzten Backups (Epoch ms). */
  lastBackupAt?: number
  /** Nach wie vielen Tagen an ein Backup erinnert wird (0 = aus). */
  backupReminderDays: number
  // ── Betriebs-Stammdaten (Studio) ──
  taxNumber?: string
  vatId?: string
  /** Datum der Gewerbeanmeldung (YYYY-MM-DD). */
  gewerbeStartDate?: string
  /** Gesundheitsamt-/Hygiene-Registrierung (Freitext). */
  healthOfficeReg?: string
  /** Berufshaftpflicht / Versicherung (Freitext). */
  insurance?: string
  // ── Kennzahlen ──
  /** Jahres-Umsatzziel in Cent. */
  revenueTargetCents?: number
  /** Manuell erfasster Vorjahresumsatz in Cent (für die §19-Prüfung). */
  priorYearRevenueCents?: number
}
