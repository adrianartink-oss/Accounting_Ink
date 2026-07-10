import type { TxFilter } from '../lib/euer'
import type { Country, Sphere } from '../db/types'

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
  return (
    <div className="mb-5 space-y-2">
      <ChipRow>
        <Chip active={filter.country === 'ALL' || !filter.country} onClick={() => onChange({ country: 'ALL' })}>
          Alle Länder
        </Chip>
        <Chip active={filter.country === 'DE'} onClick={() => onChange({ country: 'DE' as Country })}>
          🇩🇪 Deutschland
        </Chip>
        <Chip active={filter.country === 'ES'} onClick={() => onChange({ country: 'ES' as Country })}>
          🇪🇸 Spanien
        </Chip>
      </ChipRow>

      <ChipRow>
        <Chip active={filter.sphere === 'ALL' || !filter.sphere} onClick={() => onChange({ sphere: 'ALL' })}>
          Alle
        </Chip>
        <Chip active={filter.sphere === 'business'} onClick={() => onChange({ sphere: 'business' as Sphere })}>
          Gewerblich
        </Chip>
        <Chip active={filter.sphere === 'private'} onClick={() => onChange({ sphere: 'private' as Sphere })}>
          Privat
        </Chip>
      </ChipRow>

      <ChipRow>
        <Chip active={filter.year === 'ALL'} onClick={() => onChange({ year: 'ALL' })}>
          Alle Jahre
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
