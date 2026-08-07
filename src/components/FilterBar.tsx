import { useTranslation } from 'react-i18next'
import type { TxFilter } from '../lib/euer'
import type { Country, Sphere } from '../db/types'
import { EU_COUNTRIES } from '../lib/countries'

/** Chip-Filter für Land, Sphäre und Jahr. */
export default function FilterBar({
  filter,
  onChange,
  years,
}: {
  filter: TxFilter
  onChange: (patch: Partial<TxFilter>) => void
  years: number[]
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-5 space-y-2">
      <select
        className="input"
        value={filter.country ?? 'ALL'}
        onChange={(e) =>
          onChange({ country: e.target.value === 'ALL' ? 'ALL' : (e.target.value as Country) })
        }
        aria-label={t('filter.allCountries')}
      >
        <option value="ALL">{t('filter.allCountriesGlobe')}</option>
        {EU_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>

      <ChipRow>
        <Chip active={filter.sphere === 'ALL' || !filter.sphere} onClick={() => onChange({ sphere: 'ALL' })}>
          {t('filter.all')}
        </Chip>
        <Chip active={filter.sphere === 'business'} onClick={() => onChange({ sphere: 'business' as Sphere })}>
          {t('filter.business')}
        </Chip>
        <Chip active={filter.sphere === 'private'} onClick={() => onChange({ sphere: 'private' as Sphere })}>
          {t('filter.private')}
        </Chip>
      </ChipRow>

      <ChipRow>
        <Chip active={filter.year === 'ALL'} onClick={() => onChange({ year: 'ALL' })}>
          {t('filter.allYears')}
        </Chip>
        {years.map((y) => (
          <Chip key={y} active={filter.year === y} onClick={() => onChange({ year: y })}>
            {y}
          </Chip>
        ))}
      </ChipRow>
    </div>
  )
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" className="chip" data-active={active} onClick={onClick}>
      {children}
    </button>
  )
}
