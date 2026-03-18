import { useState, type ReactNode } from 'react'
import { TransactionFlow } from './TransactionFlow'
import { TransactionDetail } from './TransactionDetail'
import { useTransactionData } from '../hooks/useTransactionData'
import type { TransactionData, TransactionDanger, AssetLookupClient } from '../types'

/** Well-known Algorand network genesis hashes (base64-encoded). */
const GENESIS_HASH_NETWORK: Record<string, string> = {
  'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=': 'MainNet',
  'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=': 'TestNet',
  'mFgazF+2uRS1tMiL9dsj01hJGySEmPN28B/TjjvpVW0=': 'BetaNet',
  'kUt08LxeVAAGHnh4JoAoAMM9ql/hBwSoiFtlnKNeOxA=': 'FNet',
  // LocalNet hashes vary per setup — resolved via genesisID fallback
}

/** LocalNet genesis IDs use "sandnet-*" or "dockernet-*" prefixes. */
function isLocalNetGenesisID(genesisID: string): boolean {
  return genesisID.startsWith('sandnet') || genesisID.startsWith('dockernet')
}

function resolveNetworkName(
  genesisHash: string | null | undefined,
  genesisID: string | null | undefined,
): string | null {
  if (genesisHash) {
    const name = GENESIS_HASH_NETWORK[genesisHash]
    if (name) return name
  }
  if (genesisID && isLocalNetGenesisID(genesisID)) {
    return 'LocalNet'
  }
  return null
}

export interface TransactionReviewProps {
  transactions: TransactionData[]
  message: string
  dangerous: TransactionDanger
  algodClient?: AssetLookupClient
  getApplicationAddress?: (appId: number) => { toString(): string }
  onApprove: () => void
  onReject: () => void
  signing?: boolean
  walletName?: string
  origin?: string
  headerAction?: ReactNode
  payloadVerified?: boolean | null
  network?: string
  /** Base64-encoded genesis hash from the transaction group */
  genesisHash?: string | null
  /** Genesis ID string from the transaction group (fallback for LocalNet detection) */
  genesisID?: string | null
}

export function TransactionReview({
  transactions,
  message,
  dangerous,
  algodClient,
  getApplicationAddress,
  onApprove,
  onReject,
  signing,
  walletName,
  origin,
  headerAction,
  payloadVerified,
  network,
  genesisHash,
  genesisID,
}: TransactionReviewProps) {
  const { loading, assets, appEscrows } = useTransactionData(transactions, {
    algodClient,
    getApplicationAddress,
    network,
  })

  /** Index into transactions array for detail view, or null for list view */
  const [detailIndex, setDetailIndex] = useState<number | null>(null)

  const networkName = resolveNetworkName(genesisHash, genesisID)
  const unknownNetwork = genesisHash != null && !networkName

  // Detail view — replaces entire dialog content
  if (detailIndex !== null) {
    const txn = transactions[detailIndex]
    return (
      <TransactionDetail
        txn={txn}
        assetInfo={txn.assetIndex ? assets[txn.assetIndex.toString()] : undefined}
        position={detailIndex + 1}
        groupSize={transactions.length}
        onBack={() => setDetailIndex(null)}
        onPrev={() => setDetailIndex(detailIndex - 1)}
        onNext={() => setDetailIndex(detailIndex + 1)}
      />
    )
  }

  // List view — default
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-1">
        <h2 className={`text-lg font-bold ${dangerous ? 'text-[var(--wui-color-danger-text)]' : 'text-[var(--wui-color-text)]'}`}>
          {dangerous ? 'Review Dangerous ' : 'Review '}
          Transaction{transactions.length > 1 ? 's' : ''}
        </h2>
        {headerAction}
      </div>

      {/* Origin (extension shows request origin) */}
      {origin && (
        <div className="px-6 text-xs text-[var(--wui-color-text-tertiary)] truncate">
          {origin}
        </div>
      )}

      {/* Danger description */}
      {dangerous ? (
        <div className="px-6 pb-3 text-sm font-bold text-[var(--wui-color-danger-text)]">
          {dangerous === 'rekey'
            ? 'This transaction will rekey your account, transferring signing authority to a different address. You will no longer be able to sign transactions with your current key.'
            : (() => {
                const closeTxn = transactions.find((t) => t.closeRemainderTo)
                if (closeTxn?.type === 'axfer' && closeTxn.assetIndex) {
                  const info = assets[closeTxn.assetIndex.toString()]
                  const unit = info?.unitName || info?.name || 'this asset'
                  return `This transaction will transfer all available ${unit} to another address. Confirm that this is what you intended.`
                }
                return 'This transaction will transfer all available ALGO to another address. Confirm that this is what you intended.'
              })()}
        </div>
      ) : (
        <div className="px-6 pb-3 text-sm text-[var(--wui-color-text-secondary)]">
          {unknownNetwork && (
            <div className="font-bold text-[var(--wui-color-danger-text)] mb-1">Warning — unknown network genesis hash</div>
          )}
          {transactions.length === 1
            ? networkName
              ? <>You are about to sign the following transaction on <strong>{networkName}</strong>:</>
              : 'You are about to sign the following transaction:'
            : networkName
              ? <>You are about to sign {transactions.length} transactions on <strong>{networkName}</strong>:</>
              : `You are about to sign ${transactions.length} transactions:`}
        </div>
      )}

      {/* Transaction list */}
      <div className="px-4 pb-4 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-[var(--wui-color-text-secondary)]">
            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading asset info
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn, i) => (
              <div
                key={txn.index}
                className="rounded-xl border p-3 border-[var(--wui-color-primary)] bg-[var(--wui-color-bg-secondary)]"
              >
                <TransactionFlow
                  txn={txn}
                  assetInfo={txn.assetIndex ? assets[txn.assetIndex.toString()] : undefined}
                  appEscrows={appEscrows}
                  onExpand={() => setDetailIndex(i)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payload verification warning */}
      {payloadVerified === false && (
        <div className="px-4 pb-4">
          <div className="text-sm font-bold text-[var(--wui-color-danger-text)] border border-[var(--wui-color-danger-text)] rounded-xl p-3 bg-[var(--wui-color-danger-bg)]">
            Payload verification failed. The provided payload was invalid and has been recalculated from the raw transactions.
          </div>
        </div>
      )}

      {/* Sign payload */}
      <div className="px-4 pb-4">
        <div className="text-sm flex flex-col gap-2 border border-[var(--wui-color-border)] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span>Transaction ID to sign:</span>
            {payloadVerified === true && (
              <span className="text-xs text-green-600 font-medium">Verified</span>
            )}
          </div>
          <div className="font-mono break-all text-[var(--wui-color-danger-text)]">{message}</div>
          <div>Ensure the transaction ID is correct before approving.</div>
        </div>
      </div>

      {/* Footer */}
      {dangerous && !signing ? (
        <div className="px-6 py-4 border-t border-[var(--wui-color-border)] flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-2.5 px-4 bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text-secondary)] font-medium rounded-xl hover:brightness-90 transition-all text-sm"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 py-2.5 px-4 bg-[var(--wui-color-danger-text)] text-[var(--wui-color-danger-button-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm"
          >
            Sign (Dangerous)
          </button>
        </div>
      ) : (
        <div className="px-6 py-4 border-t border-[var(--wui-color-border)]">
          <div className="flex items-center gap-2 text-sm text-[var(--wui-color-text-secondary)]">
            <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Review in {walletName || 'wallet'}
          </div>
        </div>
      )}
    </div>
  )
}
