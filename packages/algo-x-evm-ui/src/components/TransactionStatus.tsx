import { CheckCircleFilled } from './icons'
import { Spinner } from './Spinner'

export type TransactionStatusValue = 'idle' | 'signing' | 'sending' | 'success' | 'error'

interface TransactionStatusProps {
  status: TransactionStatusValue
  error: string | null
  successMessage: string
  onRetry: () => void
  txId?: string | null
  explorerUrl?: string | null
}

function truncateTxId(txId: string): string {
  if (txId.length <= 12) return txId
  return `${txId.slice(0, 6)}...${txId.slice(-4)}`
}

export function TransactionStatus({ status, error, successMessage, onRetry, txId, explorerUrl }: TransactionStatusProps) {
  if (status === 'idle') return null

  if (status === 'signing') {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-[var(--wui-color-text-secondary)]">
        <Spinner className="h-4 w-4 mr-2" />
        Waiting for signature
      </div>
    )
  }

  if (status === 'sending') {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-[var(--wui-color-text-secondary)]">
        <Spinner className="h-4 w-4 mr-2" />
        Sending transaction
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4">
        <CheckCircleFilled className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p className="text-sm font-medium text-[var(--wui-color-text)]">{successMessage}</p>
        {txId && (
          <p className="mt-1.5 text-xs text-[var(--wui-color-text-tertiary)]">
            TX:{' '}
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--wui-color-primary)] hover:underline"
              >
                {truncateTxId(txId)}
              </a>
            ) : (
              <span className="font-mono">{truncateTxId(txId)}</span>
            )}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="text-center py-3">
      <p className="text-sm text-[var(--wui-color-danger-text)] mb-2 break-words">{error}</p>
      <button onClick={onRetry} className="text-sm text-[var(--wui-color-primary)] hover:underline">
        Try again
      </button>
    </div>
  )
}
