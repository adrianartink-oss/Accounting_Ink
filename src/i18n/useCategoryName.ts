import { useTranslation } from 'react-i18next'

/**
 * Liefert eine Funktion, die den anzuzeigenden Kategorienamen übersetzt:
 * Seed-Kategorien (bekannte IDs) werden über `seedCategories.<id>` lokalisiert,
 * selbst angelegte Kategorien behalten ihren gespeicherten Namen.
 */
export function useCategoryName(): (cat: { id: string; name: string }) => string {
  const { t } = useTranslation()
  return (cat) => t(`seedCategories.${cat.id}`, { defaultValue: cat.name })
}
