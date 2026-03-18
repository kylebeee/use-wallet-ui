import type { TransactionData, AssetInfo } from '../types'
import { formatAssetAmount, assetLabel } from '../formatters'
import { ChevronRight } from './icons'

export interface TransactionFlowProps {
  txn: TransactionData
  assetInfo?: AssetInfo
  appEscrows?: Record<string, string>
  onExpand?: () => void
}

export function TransactionFlow({ txn, assetInfo, appEscrows = {}, onExpand }: TransactionFlowProps) {
  const resolveAddr = (full: string | undefined, short: string): string =>
    (full && appEscrows[full]) || short

  const isOptIn =
    txn.type === 'axfer' &&
    txn.sender === txn.receiver &&
    (txn.rawAmount === 0n || txn.rawAmount === '0' || txn.rawAmount === undefined)

  const amountDisplay = (): string => {
    if (txn.type === 'pay') return txn.amount || '0 ALGO'
    if (txn.type === 'axfer') {
      return assetInfo
        ? formatAssetAmount(txn.rawAmount, assetInfo)
        : `${txn.amount || '0'} ${assetLabel(txn)}`
    }
    return ''
  }

  const hasRekey = !!txn.rekeyToShort
  const hasClose = !!txn.closeRemainderToShort

  /** Summary line per transaction type */
  const renderSummary = () => {
    const fiveCol = 'grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-xs'
    const threeCol = 'grid grid-cols-[1fr_auto_auto] items-center text-xs'
    const arrow = <span className="text-[var(--wui-color-text-tertiary)] px-2">&rarr;</span>
    const dash = <span className="text-[var(--wui-color-text-tertiary)] px-2">&mdash;</span>

    switch (txn.type) {
      case 'pay':
        return (
          <div className={fiveCol}>
            <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
            {arrow}
            <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap text-center">{amountDisplay()}</span>
            {arrow}
            <span className="text-[var(--wui-color-text-secondary)] truncate text-right">{resolveAddr(txn.receiver, txn.receiverShort!)}</span>
          </div>
        )

      case 'axfer':
        if (isOptIn) {
          return (
            <div className={threeCol}>
              <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
              {dash}
              <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap">
                Opt In {assetLabel(txn, assetInfo)}
              </span>
            </div>
          )
        }
        return (
          <div className={fiveCol}>
            <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
            {arrow}
            <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap text-center">{amountDisplay()}</span>
            {arrow}
            <span className="text-[var(--wui-color-text-secondary)] truncate text-right">{resolveAddr(txn.receiver, txn.receiverShort!)}</span>
          </div>
        )

      case 'afrz':
        return (
          <div className={fiveCol}>
            <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
            {arrow}
            <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap text-center">
              {txn.isFreezing ? 'Freeze' : 'Unfreeze'} {assetLabel(txn, assetInfo)}
            </span>
            {arrow}
            <span className="text-[var(--wui-color-text-secondary)] truncate text-right">{txn.freezeTargetShort}</span>
          </div>
        )

      case 'acfg':
        return (
          <div className={threeCol}>
            <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
            {dash}
            <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap">
              Configure {txn.assetIndex ? assetLabel(txn, assetInfo) : 'New Asset'}
            </span>
          </div>
        )

      case 'appl':
        return (
          <div className={fiveCol}>
            <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
            {arrow}
            <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap text-center">App Call</span>
            {arrow}
            <span className="text-[var(--wui-color-text-secondary)] whitespace-nowrap text-right">
              {txn.appIndex ? `#${txn.appIndex}` : 'New App'}
            </span>
          </div>
        )

      case 'keyreg':
        return (
          <div className={threeCol}>
            <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
            {dash}
            <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap">Key Registration</span>
          </div>
        )

      default:
        return (
          <div className={threeCol}>
            <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.senderShort}</span>
            {dash}
            <span className="text-[var(--wui-color-primary)] font-medium whitespace-nowrap">{txn.typeLabel}</span>
          </div>
        )
    }
  }

  const renderWarnings = () => {
    if (!hasRekey && !hasClose) return null
    return (
      <div className="flex flex-col gap-1 mt-1.5">
        {hasRekey && (
          <div className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 bg-[var(--wui-color-danger-bg)]">
            <span className="text-[var(--wui-color-danger-text)] font-bold">REKEY</span>
            <span className="text-[var(--wui-color-danger-text)]">
              {txn.senderShort} &rarr; {txn.rekeyToShort}
            </span>
          </div>
        )}
        {hasClose && (
          <div className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 bg-[var(--wui-color-danger-bg)]">
            <span className="text-[var(--wui-color-danger-text)] font-bold">CLOSE</span>
            <span className="text-[var(--wui-color-danger-text)]">
              Remainder &rarr; {txn.closeRemainderToShort}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Summary row + expand toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">{renderSummary()}</div>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--wui-color-bg-tertiary)] transition-colors text-[var(--wui-color-text-tertiary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wui-color-primary)] focus-visible:ring-offset-1"
            aria-label="Show details"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Note */}
      {txn.note && (
        <div className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 mt-1.5 bg-[var(--wui-color-bg-tertiary)]">
          <span className="text-[var(--wui-color-text-tertiary)] font-medium">NOTE</span>
          <span className="text-[var(--wui-color-text-secondary)] truncate">{txn.note}</span>
        </div>
      )}

      {/* Warnings (always visible) */}
      {renderWarnings()}
    </div>
  )
}
