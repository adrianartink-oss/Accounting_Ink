import { describe, expect, it } from 'vitest'
import { parseReceiptText } from './ocr'

const RECEIPT = `REWE Markt GmbH
Musterstraße 1
88085 Langenargen

Tattoo Nadeln 0805RL      12,90
Handschuhe                 8,50
Zwischensumme             21,40
SUMME EUR                 21,40
Gegeben BAR               25,00
Rückgeld                   3,60

Datum: 05.07.2026  14:32
MwSt 19%                   3,42`

describe('parseReceiptText', () => {
  it('erkennt die Summe aus der SUMME-Zeile', () => {
    expect(parseReceiptText(RECEIPT).amountCents).toBe(2140)
  })
  it('erkennt und normalisiert das Datum', () => {
    expect(parseReceiptText(RECEIPT).date).toBe('2026-07-05')
  })
  it('rät den Händler aus der obersten Zeile', () => {
    expect(parseReceiptText(RECEIPT).vendor).toContain('REWE')
  })

  it('nimmt den größten Betrag, wenn kein Schlüsselwort vorhanden ist', () => {
    const t = 'Artikel A 3,00\nArtikel B 19,99\nArtikel C 5,50'
    expect(parseReceiptText(t).amountCents).toBe(1999)
  })

  it('ignoriert Zwischensumme/Rückgeld/MwSt', () => {
    const t = 'Zwischensumme 50,00\nGESAMT 42,00\nRückgeld 8,00\nMwSt 6,70'
    expect(parseReceiptText(t).amountCents).toBe(4200)
  })

  it('normalisiert zweistellige Jahre', () => {
    expect(parseReceiptText('Beleg vom 12.03.24').date).toBe('2024-03-12')
  })

  it('gibt undefined bei fehlenden Werten', () => {
    const r = parseReceiptText('nur text ohne zahlen')
    expect(r.amountCents).toBeUndefined()
    expect(r.date).toBeUndefined()
  })
})
