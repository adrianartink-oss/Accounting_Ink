import { describe, expect, it } from 'vitest'
import { advanceDate, dueDates } from './recurring'

describe('advanceDate', () => {
  it('wöchentlich +7 Tage', () => {
    expect(advanceDate('2026-05-01', 'weekly')).toBe('2026-05-08')
  })
  it('monatlich mit Monatsende-Klemmung', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28')
  })
  it('vierteljährlich +3 Monate', () => {
    expect(advanceDate('2026-01-15', 'quarterly')).toBe('2026-04-15')
  })
  it('jährlich +12 Monate über Jahresgrenze', () => {
    expect(advanceDate('2026-12-10', 'yearly')).toBe('2027-12-10')
  })
})

describe('dueDates', () => {
  it('erzeugt alle fälligen Monatstermine bis heute', () => {
    const { dates, nextDate } = dueDates(
      { interval: 'monthly', nextDate: '2026-01-01' },
      '2026-03-15',
    )
    expect(dates).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    expect(nextDate).toBe('2026-04-01')
  })
  it('respektiert das Enddatum', () => {
    const { dates } = dueDates(
      { interval: 'monthly', nextDate: '2026-01-01', endDate: '2026-02-15' },
      '2026-12-31',
    )
    expect(dates).toEqual(['2026-01-01', '2026-02-01'])
  })
  it('gibt keine Termine, wenn nichts fällig ist', () => {
    const { dates, nextDate } = dueDates(
      { interval: 'monthly', nextDate: '2026-06-01' },
      '2026-05-01',
    )
    expect(dates).toHaveLength(0)
    expect(nextDate).toBe('2026-06-01')
  })
})
