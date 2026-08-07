import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, X } from 'lucide-react'
import { useCategories } from '../store/hooks'
import { addCategory, deleteCategory } from '../db/repo'
import type { Sphere, TxType } from '../db/types'
import { useCategoryName } from '../i18n/useCategoryName'
import PageHeader from '../components/PageHeader'
import CategoryIcon, { ICON_NAMES } from '../components/CategoryIcon'

const COLORS = [
  '#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#c026d3',
  '#db2777', '#e11d48', '#dc2626', '#ea580c', '#d97706',
  '#ca8a04', '#65a30d', '#16a34a', '#059669',
]

export default function Categories() {
  const { t } = useTranslation()
  const categoryName = useCategoryName()
  const categories = useCategories()
  const [adding, setAdding] = useState(false)

  const sections = useMemo(() => {
    return [
      { key: 'business-income', titleKey: 'categories.businessIncome', kind: 'income' as TxType, sphere: 'business' as Sphere },
      { key: 'business-expense', titleKey: 'categories.businessExpense', kind: 'expense' as TxType, sphere: 'business' as Sphere },
      { key: 'private-income', titleKey: 'categories.privateIncome', kind: 'income' as TxType, sphere: 'private' as Sphere },
      { key: 'private-expense', titleKey: 'categories.privateExpense', kind: 'expense' as TxType, sphere: 'private' as Sphere },
    ].map((s) => ({
      ...s,
      items: categories.filter((c) => c.kind === s.kind && c.sphere === s.sphere),
    }))
  }, [categories])

  return (
    <div>
      <PageHeader
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        action={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={18} /> {t('common.new')}
          </button>
        }
      />

      {adding && <AddForm onClose={() => setAdding(false)} />}

      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.key}>
            <h3
              className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'var(--muted)' }}
            >
              {t(section.titleKey)}
            </h3>
            <div className="card !p-2">
              {section.items.length === 0 ? (
                <p className="px-2 py-2 text-sm" style={{ color: 'var(--muted)' }}>
                  {t('categories.empty')}
                </p>
              ) : (
                section.items.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2"
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: `color-mix(in srgb, ${c.color} 18%, transparent)` }}
                    >
                      <CategoryIcon name={c.icon} size={18} color={c.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium" style={{ color: 'var(--fg)' }}>
                        {categoryName(c)}
                      </div>
                      {c.skr03Code && (
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>
                          SKR03 {c.skr03Code}
                        </div>
                      )}
                    </div>
                    {c.custom && (
                      <button
                        className="rounded-lg p-2"
                        onClick={() => {
                          if (confirm(t('categories.confirmDelete', { name: categoryName(c) })))
                            deleteCategory(c.id)
                        }}
                      >
                        <Trash2 size={16} color="var(--expense)" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TxType>('expense')
  const [sphere, setSphere] = useState<Sphere>('business')
  const [color, setColor] = useState(COLORS[0])
  const [icon, setIcon] = useState(ICON_NAMES[0])
  const [skr03Code, setSkr03Code] = useState('')

  async function submit() {
    if (!name.trim()) return
    await addCategory({
      name: name.trim(),
      kind,
      sphere,
      color,
      icon,
      skr03Code: skr03Code.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="card mb-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
          {t('categories.newTitle')}
        </h2>
        <button onClick={onClose} className="p-1">
          <X size={18} color="var(--muted)" />
        </button>
      </div>

      <div className="space-y-3">
        <input
          className="input"
          placeholder={t('categories.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            className="input"
            value={kind}
            onChange={(e) => setKind(e.target.value as TxType)}
          >
            <option value="expense">{t('categories.expense')}</option>
            <option value="income">{t('categories.income')}</option>
          </select>
          <select
            className="input"
            value={sphere}
            onChange={(e) => setSphere(e.target.value as Sphere)}
          >
            <option value="business">{t('categories.business')}</option>
            <option value="private">{t('categories.private')}</option>
          </select>
        </div>

        <input
          className="input"
          placeholder={t('categories.skrPlaceholder')}
          value={skr03Code}
          onChange={(e) => setSkr03Code(e.target.value)}
        />

        <div>
          <span className="label">{t('categories.color')}</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="h-8 w-8 rounded-full transition"
                style={{
                  background: c,
                  outline: color === c ? '2px solid var(--fg)' : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="label">{t('categories.icon')}</span>
          <div className="flex flex-wrap gap-2">
            {ICON_NAMES.map((n) => (
              <button
                key={n}
                onClick={() => setIcon(n)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border"
                style={{
                  borderColor: icon === n ? color : 'var(--border)',
                  background: icon === n ? `color-mix(in srgb, ${color} 18%, transparent)` : 'var(--bg-elev)',
                }}
              >
                <CategoryIcon name={n} size={18} color={color} />
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary w-full" onClick={submit}>
          {t('categories.create')}
        </button>
      </div>
    </div>
  )
}
