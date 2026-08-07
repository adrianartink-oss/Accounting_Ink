import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useCategories, useSettings, useTransaction } from '../store/hooks'
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
  type TransactionInput,
} from '../db/repo'
import type { TransactionFormValues } from '../components/TransactionForm'
import TransactionForm from '../components/TransactionForm'
import PageHeader from '../components/PageHeader'

/** Optionaler Prefill-State (z. B. vom Beleg-Scan). */
interface AddState {
  prefill?: Partial<TransactionFormValues>
  receiptId?: string
  fromAi?: boolean
}

export default function AddTransaction() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as AddState

  const settings = useSettings()
  const categories = useCategories()
  const existing = useTransaction(id)

  const isEdit = Boolean(id)

  // Beim Bearbeiten warten, bis der Datensatz geladen ist.
  if (isEdit && !existing) {
    return (
      <div>
        <BackHeader title={t('addTransaction.transaction')} onBack={() => navigate(-1)} />
        <div className="card text-center" style={{ color: 'var(--muted)' }}>
          {t('common.loading')}
        </div>
      </div>
    )
  }

  const initial: Partial<TransactionFormValues> | undefined = existing
    ? {
        type: existing.type,
        sphere: existing.sphere,
        country: existing.country,
        categoryId: existing.categoryId,
        amountCents: existing.amountCents,
        date: existing.date,
        counterparty: existing.counterparty,
        description: existing.description,
        vatRateBps: existing.vatRateBps,
        motif: existing.motif,
        bodyPart: existing.bodyPart,
        sizeText: existing.sizeText,
        durationMin: existing.durationMin,
      }
    : state.prefill

  async function handleSave(input: TransactionInput) {
    const payload: TransactionInput = {
      ...input,
      source: state.fromAi ? 'ai' : existing?.source ?? 'manual',
      receiptId: state.receiptId ?? existing?.receiptId,
    }
    if (isEdit && id) {
      await updateTransaction(id, payload)
    } else {
      await addTransaction(payload)
    }
    navigate('/transactions')
  }

  async function handleDelete() {
    if (!id) return
    if (confirm(t('addTransaction.confirmDelete'))) {
      await deleteTransaction(id)
      navigate('/transactions')
    }
  }

  return (
    <div>
      <BackHeader
        title={isEdit ? t('addTransaction.editTitle') : t('addTransaction.createTitle')}
        subtitle={state.fromAi ? t('addTransaction.aiPrefill') : undefined}
        onBack={() => navigate(-1)}
        ai={state.fromAi}
      />
      <div className="card">
        <TransactionForm
          categories={categories}
          settings={settings}
          initial={initial}
          receiptId={state.receiptId ?? existing?.receiptId}
          submitLabel={isEdit ? t('addTransaction.saveChanges') : t('addTransaction.saveTransaction')}
          onSave={handleSave}
          onDelete={isEdit ? handleDelete : undefined}
        />
      </div>
    </div>
  )
}

function BackHeader({
  title,
  subtitle,
  onBack,
  ai,
}: {
  title: string
  subtitle?: string
  onBack: () => void
  ai?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-2">
      <button
        onClick={onBack}
        className="mb-2 flex items-center gap-1 text-sm font-medium"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={16} /> {t('common.back')}
      </button>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={ai ? <Sparkles size={22} color="var(--accent)" /> : undefined}
      />
    </div>
  )
}
