import { describe, expect, it } from 'vitest'
import de from './locales/de.json'
import en from './locales/en.json'
import nl from './locales/nl.json'
import es from './locales/es.json'
import pt from './locales/pt.json'
import fr from './locales/fr.json'
import itLocale from './locales/it.json'

/** Flacht verschachtelte Keys zu Pfaden ab; `_meta` wird ignoriert. */
function flatKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    if (k === '_meta') return []
    const key = prefix ? `${prefix}.${k}` : k
    return flatKeys(v, key)
  })
}

const base = flatKeys(de).sort()
const locales: Record<string, unknown> = { en, nl, es, pt, fr, it: itLocale }

describe('i18n Locale-Vollständigkeit', () => {
  it('de enthält Keys (Sanity-Check)', () => {
    expect(base.length).toBeGreaterThan(100)
  })

  for (const [name, res] of Object.entries(locales)) {
    it(`${name} hat denselben Key-Satz wie de`, () => {
      expect(flatKeys(res).sort()).toEqual(base)
    })
  }
})
