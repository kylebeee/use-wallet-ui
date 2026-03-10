import type { TransactionData, AssetInfo } from '../types'
import { formatAssetAmount, assetLabel } from '../formatters'

export interface TransactionFlowProps {
  txn: TransactionData
  assetInfo?: AssetInfo
  appEscrows?: Record<string, string>
}

export function TransactionFlow({ txn, assetInfo, appEscrows = {} }: TransactionFlowProps) {
  const resolveAddr = (full: string | undefined, short: string): string =>
    (full && appEscrows[full]) || short

  const renderFlowLine = (
    from: string,
    label: string,
    to: string,
    isDanger: boolean = false,
    isSecondary: boolean = false,
  ) => (
    <div className={`grid grid-cols-[1fr_auto_1fr] w-full items-center font-mono text-xs ${isSecondary ? 'mt-1' : ''}`}>
      <span className="text-[var(--wui-color-text-secondary)] text-left">{from}</span>
      <span className="flex items-center justify-center gap-1 px-1">
        <span className="text-[var(--wui-color-text-tertiary)]">--[</span>
        <span className={isDanger ? 'text-[var(--wui-color-danger-text)] font-bold' : 'text-[var(--wui-color-primary)] font-medium'}>
          {label}
        </span>
        <span className="text-[var(--wui-color-text-tertiary)]">]--&gt;</span>
      </span>
      <span className={`text-right ${isDanger ? 'text-[var(--wui-color-danger-text)] font-bold' : 'text-[var(--wui-color-text-secondary)]'}`}>{to}</span>
    </div>
  )

  const renderRemainderLine = (to: string) => (
    <div className="grid grid-cols-[1fr_auto_1fr] w-full items-center font-mono text-xs mt-1">
      <span />
      <span className="flex items-center justify-center gap-1 px-1">
        <span className="text-[var(--wui-color-text-tertiary)]">--[</span>
        <span className="text-[var(--wui-color-danger-text)] font-bold">remainder</span>
        <span className="text-[var(--wui-color-text-tertiary)]">]--&gt;</span>
      </span>
      <span className="text-[var(--wui-color-danger-text)] font-bold text-right">{to}</span>
    </div>
  )

  const renderRekeyLine = (from: string, to: string) => (
    <div className="grid grid-cols-[1fr_auto_1fr] w-full items-center font-mono text-xs mt-1">
      <span className="text-[var(--wui-color-text-secondary)] text-left">{from}</span>
      <span className="flex items-center justify-center gap-1 px-1">
        <span className="text-[var(--wui-color-text-tertiary)]">--[</span>
        <span className="text-[var(--wui-color-danger-text)] font-bold">REKEY</span>
        <span className="text-[var(--wui-color-text-tertiary)]">]--&gt;</span>
      </span>
      <span className="text-[var(--wui-color-danger-text)] font-bold text-right">{to}</span>
    </div>
  )

  return (
    <div className="space-y-0">
      {/* Payment transaction */}
      {txn.type === 'pay' && txn.receiverShort && (
        <>
          {renderFlowLine(txn.senderShort, txn.amount || '0 ALGO', resolveAddr(txn.receiver, txn.receiverShort))}
          {txn.closeRemainderToShort && renderRemainderLine(txn.closeRemainderToShort)}
        </>
      )}

      {/* Asset transfer */}
      {txn.type === 'axfer' && txn.receiverShort && (
        <>
          {renderFlowLine(
            txn.senderShort,
            assetInfo ? formatAssetAmount(txn.rawAmount, assetInfo) : `${txn.amount || '0'} ${assetLabel(txn)}`,
            resolveAddr(txn.receiver, txn.receiverShort),
          )}
          {txn.closeRemainderToShort && renderRemainderLine(txn.closeRemainderToShort)}
        </>
      )}

      {/* Asset freeze */}
      {txn.type === 'afrz' && txn.freezeTargetShort && (
        <>
          {renderFlowLine(
            txn.senderShort,
            `${txn.isFreezing ? 'Freeze' : 'Unfreeze'} ${assetLabel(txn, assetInfo)}`,
            txn.freezeTargetShort,
          )}
        </>
      )}

      {/* Asset config */}
      {txn.type === 'acfg' && (
        <>
          {renderFlowLine(
            txn.senderShort,
            `Configure ${txn.assetIndex ? assetLabel(txn, assetInfo) : 'NEW'}`,
            txn.senderShort,
          )}
        </>
      )}

      {/* Application call */}
      {txn.type === 'appl' && (
        <>
          {renderFlowLine(
            txn.senderShort,
            'APP CALL',
            `App ${txn.appIndex || 'NEW'}`,
          )}
        </>
      )}

      {/* Key registration */}
      {txn.type === 'keyreg' && (
        <>
          {renderFlowLine(txn.senderShort, 'KEY REG', txn.senderShort)}
        </>
      )}

      {/* Rekey (applies to any transaction type) */}
      {txn.rekeyToShort && renderRekeyLine(txn.senderShort, txn.rekeyToShort)}
    </div>
  )
}
