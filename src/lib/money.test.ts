import { describe, expect, it } from 'vitest'
import { centsToInputString, formatCents, formatSignedCents, parseAmountToCents } from './money'

describe('parseAmountToCents', () => {
  it('parst deutsches Komma-Format', () => {
    expect(parseAmountToCents('42,50')).toBe(4250)
  })
  it('parst Tausenderpunkte mit Komma', () => {
    expect(parseAmountToCents('1.234,56')).toBe(123456)
  })
  it('parst Punkt als Dezimaltrenner', () => {
    expect(parseAmountToCents('42.50')).toBe(4250)
  })
  it('ignoriert Währungssymbole und Leerzeichen', () => {
    expect(parseAmountToCents('€ 9,99')).toBe(999)
  })
  it('rundet auf Cent', () => {
    expect(parseAmountToCents('1,005')).toBe(101)
  })
  it('gibt null bei ungültiger Eingabe', () => {
    expect(parseAmountToCents('')).toBeNull()
    expect(parseAmountToCents('abc')).toBeNull()
  })
})

describe('formatCents', () => {
  it('formatiert als EUR (de-DE)', () => {
    const out = formatCents(4250)
    expect(out).toContain('42,50')
    expect(out).toContain('€')
  })
})

describe('formatSignedCents', () => {
  it('setzt + bei positiv und − bei negativ', () => {
    expect(formatSignedCents(4250)).toContain('+')
    expect(formatSignedCents(-4250)).toContain('−')
  })
})

describe('centsToInputString', () => {
  it('gibt editierbaren de-DE-String ohne Gruppierung', () => {
    expect(centsToInputString(123456)).toBe('1234,56')
  })
})
