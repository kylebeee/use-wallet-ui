import { useCallback, useState } from 'react'
import { AddToWalletPanel, type AddToWalletPanelProps } from './AddToWalletPanel'
import { AlgoSymbol } from './AlgoSymbol'
import { BackButton } from './BackButton'
import { BridgePanel, type BridgePanelProps } from './BridgePanel'
import { ArrowDownLeft, ArrowUpRight, ArrowsExchange, ChevronsUpDown, RefreshCw, Search } from './icons'
import { ReceivePanel, type ReceivePanelProps } from './ReceivePanel'
import { SendPanel, type SendPanelProps } from './SendPanel'

export interface AssetHoldingDisplay {
  assetId: number
  name: string
  unitName: string
  amount: string
  decimals: number
}

export interface ManagePanelProps {
  displayBalance: number | null
  showAvailableBalance: boolean
  onToggleBalance: () => void
  onBack: () => void
  send?: Omit<SendPanelProps, 'onBack'>
  optIn?: Omit<ReceivePanelProps, 'onBack'>
  bridge?: Omit<BridgePanelProps, 'onBack'>
  assets?: AssetHoldingDisplay[]
  totalBalance?: number | null
  availableBalance?: number | null
  onRefresh?: () => void
  isRefreshing?: boolean
  onExplore?: () => void
  /** When provided, the Bridge button calls this instead of navigating to the embedded bridge panel */
  onBridgeClick?: () => void
  addToWallet?: Omit<AddToWalletPanelProps, 'onBack'>
}

const balanceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

const INITIAL_ASSET_COUNT = 3

function formatDisplayAmount(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  // Preserve the original decimal digits but add locale thousand separators
  const [, frac] = amount.split('.')
  return num.toLocaleString(undefined, {
    minimumFractionDigits: frac?.length ?? 0,
    maximumFractionDigits: frac?.length ?? 0,
  })
}

export function ManagePanel({
  displayBalance,
  showAvailableBalance,
  onToggleBalance,
  onBack,
  send,
  optIn,
  bridge,
  assets,
  totalBalance,
  availableBalance,
  onRefresh,
  isRefreshing,
  onExplore,
  onBridgeClick,
  addToWallet,
}: ManagePanelProps) {
  const [mode, setMode] = useState<'main' | 'send' | 'opt-in' | 'bridge' | 'add-to-wallet'>('main')
  const [showAllAssets, setShowAllAssets] = useState(false)
  const [animDir, setAnimDir] = useState<'forward' | 'back' | 'none'>('none')

  const goForward = useCallback((target: 'send' | 'opt-in' | 'bridge' | 'add-to-wallet') => {
    setAnimDir('forward')
    setMode(target)
  }, [])

  const goBack = useCallback((resetFn?: () => void) => {
    setAnimDir('back')
    setMode('main')
    resetFn?.()
  }, [])

  let content: React.ReactNode

  if (mode === 'send' && send) {
    content = <SendPanel {...send} accountAssets={assets} totalBalance={totalBalance} availableBalance={availableBalance} onBack={() => goBack(send.reset)} />
  } else if (mode === 'opt-in' && optIn) {
    const handleOptOut = send ? (assetIndex: number) => {
      const asset = assets?.find((a) => a.assetId === assetIndex)
      send.setSendType('asa')
      send.setAssetIdInput(String(assetIndex))
      if (asset) {
        send.setAmount(asset.amount)
      }
      send.setOptOut?.(true)
      goForward('send')
    } : undefined
    content = <ReceivePanel {...optIn} onOptOut={handleOptOut} onBack={() => goBack(optIn.reset)} />
  } else if (mode === 'bridge' && bridge) {
    content = <BridgePanel {...bridge} onBack={() => goBack(bridge.onReset)} />
  } else if (mode === 'add-to-wallet' && addToWallet) {
    content = <AddToWalletPanel {...addToWallet} onBack={() => goBack()} />
  } else {
    content = (
      <>
        {/* Header with back arrow */}
        <div className="flex items-center gap-2 mb-4">
          <BackButton onClick={onBack} />
          <h3 className="text-lg font-bold leading-none text-[var(--wui-color-text)] wallet-custom-font">
            Manage Algo x EVM Account
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ml-auto p-1 rounded-lg hover:bg-[var(--wui-color-bg-secondary)] transition-colors text-[var(--wui-color-text-tertiary)] hover:text-[var(--wui-color-text-secondary)] flex items-center justify-center disabled:pointer-events-none"
              title="Refresh"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {/* Balance display */}
        <div className="mb-4 bg-[var(--wui-color-bg-secondary)] rounded-lg p-3">
          <div className="flex justify-between items-center">
            {displayBalance !== null && (
              <span className="text-base font-medium text-[var(--wui-color-text)] flex items-center gap-1">
                {balanceFormatter.format(displayBalance)}
                <AlgoSymbol />
              </span>
            )}
            <button
              onClick={onToggleBalance}
              className="flex items-center gap-1 text-sm text-[var(--wui-color-text-secondary)] bg-[var(--wui-color-bg-tertiary)] py-1 pl-2.5 pr-2 rounded-md hover:brightness-90 transition-all focus:outline-none"
              title={showAvailableBalance ? 'Show total balance' : 'Show available balance'}
            >
              {showAvailableBalance ? 'Available' : 'Total'}
              <ChevronsUpDown size={10} className="ml-0.5 opacity-80" />
            </button>
          </div>
        </div>

        {/* Assets */}
        {assets && assets.length > 0 && (
          <div className="mb-4">
            <div className="border-t border-[var(--wui-color-border)] mb-3" />
            <h4 className="text-xs font-medium text-[var(--wui-color-text-tertiary)] uppercase tracking-wide mb-1.5">
              Assets
            </h4>
            <div
              className={showAllAssets ? 'overflow-y-auto' : ''}
              style={showAllAssets ? { maxHeight: `${INITIAL_ASSET_COUNT * 2 * 28}px` } : undefined}
            >
              {(showAllAssets ? assets : assets.slice(0, INITIAL_ASSET_COUNT)).map((asset) => (
                <div
                  key={asset.assetId}
                  className="flex justify-between items-center py-1"
                >
                  <span className="text-sm text-[var(--wui-color-text-secondary)] truncate mr-3 flex items-center gap-1.5">
                    {asset.name}{' '}
                    <span className="text-[var(--wui-color-text-tertiary)]">
                      (ID {asset.assetId})
                    </span>
                    {send && (
                      <button
                        onClick={() => {
                          send.setSendType('asa')
                          send.setAssetIdInput(String(asset.assetId))
                          goForward('send')
                        }}
                        className="inline-flex items-center justify-center w-4 h-4 rounded-xs border border-[var(--wui-color-border)] text-[var(--wui-color-text-tertiary)] hover:text-[var(--wui-color-text-secondary)] hover:border-[var(--wui-color-text-tertiary)] transition-colors shrink-0"
                        title={`Send ${asset.unitName || asset.name}`}
                      >
                        <ArrowUpRight size={10} strokeWidth={2.5} />
                      </button>
                    )}
                  </span>
                  <span className="text-sm font-medium text-[var(--wui-color-text)] tabular-nums whitespace-nowrap">
                    {formatDisplayAmount(asset.amount)}{asset.unitName ? ` ${asset.unitName}` : ''}
                  </span>
                </div>
              ))}
            </div>
            {assets.length > INITIAL_ASSET_COUNT && (
              <button
                onClick={() => setShowAllAssets((v) => !v)}
                className="text-xs text-[var(--wui-color-text-tertiary)] hover:text-[var(--wui-color-text-secondary)] transition-colors mt-1"
              >
                {showAllAssets ? 'show less' : `+${assets.length - INITIAL_ASSET_COUNT} more`}
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[var(--wui-color-border)] mb-3" />

        {/* Action buttons grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => goForward('send')}
            disabled={!send}
            className="py-2.5 px-4 bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowUpRight className="h-4 w-4 mr-1.5" />
            Send
          </button>
          <button
            onClick={() => goForward('opt-in')}
            disabled={!optIn}
            className="py-2.5 px-4 bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowDownLeft className="h-4 w-4 mr-1.5" />
            Receive
          </button>
          <button
            onClick={onBridgeClick ?? (() => goForward('bridge'))}
            disabled={!bridge && !onBridgeClick}
            className="py-2.5 px-4 bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowsExchange className="h-4 w-4 mr-1.5" />
            Bridge
          </button>
          <button
            onClick={onExplore}
            disabled={!onExplore}
            className="py-2.5 px-4 bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          >
            <Search className="h-4 w-4 mr-1.5" />
            Explore
          </button>
          {addToWallet && (
            <button
              onClick={() => goForward('add-to-wallet')}
              className="col-span-2 py-2.5 px-4 bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm flex items-center justify-center"
            >
              <img src={addToWallet.walletIcon} alt={`${addToWallet.walletName} icon`} width={16} height={16} className="mr-1.5 object-contain" />
              Add to {addToWallet.walletName}
            </button>
          )}
        </div>
      </>
    )
  }

  const animation =
    animDir === 'forward'
      ? 'wui-slide-fwd 180ms ease-out both'
      : animDir === 'back'
        ? 'wui-slide-back 180ms ease-out both'
        : 'none'

  return (
    <>
      <style>{`
        @keyframes wui-slide-fwd {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes wui-slide-back {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div key={mode} style={{ animation }}>
        {content}
      </div>
    </>
  )
}
