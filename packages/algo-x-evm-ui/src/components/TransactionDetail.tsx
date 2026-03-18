import type { TransactionData, AssetInfo } from '../types'
import { formatAssetAmount, assetLabel } from '../formatters'
import { BackButton } from './BackButton'
import { ChevronLeft, ChevronRight } from './icons'

export interface TransactionDetailProps {
  txn: TransactionData
  assetInfo?: AssetInfo
  /** 1-based position in group */
  position: number
  groupSize: number
  onBack: () => void
  onPrev: () => void
  onNext: () => void
}

export function TransactionDetail({
  txn,
  assetInfo,
  position,
  groupSize,
  onBack,
  onPrev,
  onNext,
}: TransactionDetailProps) {
  const hasPrev = position > 1
  const hasNext = position < groupSize

  const amountDisplay = (): string | undefined => {
    if (txn.type === 'pay') return txn.amount || '0 ALGO'
    if (txn.type === 'axfer') {
      return assetInfo
        ? formatAssetAmount(txn.rawAmount, assetInfo)
        : `${txn.amount || '0'} ${assetLabel(txn)}`
    }
    return undefined
  }

  const dangerFields = new Set(['Rekey To', 'Close Remainder To'])

  const detailRows: Array<[string, string | number | boolean | undefined]> = [
    // Core
    ['Type', txn.typeLabel],
    ['Sender', txn.sender],
    ['Receiver', txn.receiver],
    ['Amount', (txn.type === 'pay' || txn.type === 'axfer') ? amountDisplay() : undefined],
    ['Asset ID', txn.assetIndex],
    ['Asset Sender', txn.assetSender],
    ['App ID', txn.appIndex],
    ['On Complete', txn.onComplete],
    // Dangerous
    ['Rekey To', txn.rekeyTo],
    ['Close Remainder To', txn.closeRemainderTo],
    // Asset freeze
    ['Freeze Target', txn.freezeTarget],
    ['Freezing', txn.type === 'afrz' ? (txn.isFreezing ? 'Yes' : 'No') : undefined],
    // App call
    ['App Args', txn.appArgs?.join(', ')],
    ['App Accounts', txn.appAccounts?.join(', ')],
    ['Foreign Apps', txn.appForeignApps?.join(', ')],
    ['Foreign Assets', txn.appForeignAssets?.join(', ')],
    ['Approval Program', txn.approvalProgram],
    ['Clear Program', txn.clearProgram],
    // Key registration
    ['Vote Key', txn.voteKey],
    ['Selection Key', txn.selectionKey],
    ['State Proof Key', txn.stateProofKey],
    ['Vote First', txn.voteFirst],
    ['Vote Last', txn.voteLast],
    ['Vote Key Dilution', txn.voteKeyDilution],
    ['Non-Participation', txn.nonParticipation !== undefined ? (txn.nonParticipation ? 'Yes' : 'No') : undefined],
    // Asset config
    ['Asset Name', txn.assetName],
    ['Unit Name', txn.assetUnitName],
    ['Total Supply', txn.assetTotal],
    ['Decimals', txn.assetDecimals],
    ['Default Frozen', txn.assetDefaultFrozen !== undefined ? (txn.assetDefaultFrozen ? 'Yes' : 'No') : undefined],
    ['Manager', txn.assetManager],
    ['Reserve', txn.assetReserve],
    ['Freeze Address', txn.assetFreeze],
    ['Clawback', txn.assetClawback],
    ['Asset URL', txn.assetURL],
    // Common
    ['Fee', txn.fee],
    ['First Valid', txn.firstValid],
    ['Last Valid', txn.lastValid],
    ['Genesis ID', txn.genesisID],
    ['Genesis Hash', txn.genesisHash],
    ['Group', txn.group],
    ['Lease', txn.lease],
    ['Note', txn.note],
  ]

  const visibleDetails = detailRows.filter(([, v]) => v !== undefined && v !== '' && v !== 0)

  return (
    <div className="flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <BackButton onClick={onBack} variant="round" aria-label="Back to transactions" />
        <h2 className="text-lg font-bold text-[var(--wui-color-text)]">
          Transaction Details
        </h2>
      </div>

      {/* Detail fields */}
      <div className="px-6 pb-4 space-y-3 max-h-80 overflow-y-auto">
        {visibleDetails.map(([label, value]) => {
          const isDanger = dangerFields.has(label)
          return (
            <div key={label} className="flex flex-col gap-0.5">
              <span className={`text-[10px] uppercase tracking-wide ${isDanger ? 'text-[var(--wui-color-danger-text)] font-bold' : 'text-[var(--wui-color-text-secondary)]'}`}>
                {label}
              </span>
              <span className={`text-sm font-mono break-all ${isDanger ? 'text-[var(--wui-color-danger-text)]' : 'text-[var(--wui-color-text)]'}`}>
                {String(value)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Navigation footer */}
      {groupSize > 1 && (
        <div className="px-6 py-3 border-t border-[var(--wui-color-border)] flex items-center justify-between">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--wui-color-bg-tertiary)] transition-colors text-[var(--wui-color-text-secondary)] disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wui-color-primary)] focus-visible:ring-offset-1"
            aria-label="Previous transaction"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-[var(--wui-color-text-secondary)]">
            {position} of {groupSize}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--wui-color-bg-tertiary)] transition-colors text-[var(--wui-color-text-secondary)] disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wui-color-primary)] focus-visible:ring-offset-1"
            aria-label="Next transaction"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
