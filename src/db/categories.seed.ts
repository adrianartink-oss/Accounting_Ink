import type { Category } from './types'

/**
 * Standard-Kategorien, angelehnt an den Kontenrahmen SKR03 und zugeschnitten
 * auf ein Tätowier-Einzelunternehmen. SKR03-Codes sind informativ und helfen
 * beim späteren Export / Gespräch mit dem Steuerberater.
 *
 * Icons sind lucide-react Namen; Farben sind HEX-Akzente. Die Array-Reihenfolge
 * bestimmt die Sortierung in Auswahllisten (siehe `sortOrder` unten).
 */
const RAW: Omit<Category, 'sortOrder'>[] = [
  // ── Gewerbliche Einnahmen ──────────────────────────────────────────────
  {
    id: 'inc-tattoo',
    name: 'Tattoo-Umsätze',
    kind: 'income',
    sphere: 'business',
    skr03Code: '8400',
    color: '#0d9488',
    icon: 'Feather',
  },
  {
    id: 'inc-deposit',
    name: 'Anzahlungen / Gutscheine',
    kind: 'income',
    sphere: 'business',
    skr03Code: '8410',
    color: '#0891b2',
    icon: 'Ticket',
  },
  {
    id: 'inc-merch',
    name: 'Merch / Kunstverkauf',
    kind: 'income',
    sphere: 'business',
    skr03Code: '8401',
    color: '#7c3aed',
    icon: 'ShoppingBag',
  },
  {
    id: 'inc-other-biz',
    name: 'Sonstige Erlöse',
    kind: 'income',
    sphere: 'business',
    skr03Code: '8500',
    color: '#65a30d',
    icon: 'CircleDollarSign',
  },

  // ── Private Einnahmen ──────────────────────────────────────────────────
  {
    id: 'inc-private',
    name: 'Privateinnahme',
    kind: 'income',
    sphere: 'private',
    color: '#16a34a',
    icon: 'Wallet',
  },

  // ── Gewerbliche Ausgaben ───────────────────────────────────────────────
  {
    id: 'exp-supplies',
    name: 'Wareneinkauf (Farben, Nadeln, Einweg)',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '3400',
    color: '#dc2626',
    icon: 'Syringe',
  },
  {
    id: 'exp-rent',
    name: 'Studio-Miete',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4210',
    color: '#ea580c',
    icon: 'Building2',
  },
  {
    id: 'exp-insurance',
    name: 'Versicherungen',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4360',
    color: '#d97706',
    icon: 'ShieldCheck',
  },
  {
    id: 'exp-equipment',
    name: 'Arbeitsmittel / Geräte',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4855',
    color: '#ca8a04',
    icon: 'Wrench',
  },
  {
    id: 'exp-travel',
    name: 'Reisekosten',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4670',
    color: '#0284c7',
    icon: 'Plane',
  },
  {
    id: 'exp-education',
    name: 'Fortbildung / Conventions',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4945',
    color: '#2563eb',
    icon: 'GraduationCap',
  },
  {
    id: 'exp-marketing',
    name: 'Marketing / Website',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4600',
    color: '#7c3aed',
    icon: 'Megaphone',
  },
  {
    id: 'exp-office',
    name: 'Bürobedarf',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4930',
    color: '#9333ea',
    icon: 'Paperclip',
  },
  {
    id: 'exp-bank',
    name: 'Bankgebühren',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4970',
    color: '#c026d3',
    icon: 'Landmark',
  },
  {
    id: 'exp-other-biz',
    name: 'Sonstige Betriebsausgaben',
    kind: 'expense',
    sphere: 'business',
    skr03Code: '4900',
    color: '#db2777',
    icon: 'Receipt',
  },

  // ── Private Ausgaben ───────────────────────────────────────────────────
  {
    id: 'exp-private',
    name: 'Privatausgabe',
    kind: 'expense',
    sphere: 'private',
    color: '#e11d48',
    icon: 'Home',
  },
]

/** Kategorien mit kuratierter Sortierreihenfolge (Array-Index). */
export const seedCategories: Category[] = RAW.map((c, i) => ({ ...c, sortOrder: i }))
