import { BackButton } from './BackButton'
import type { AssetHoldingDisplay } from './ManagePanel'

export interface AddToWalletPanelProps {
  walletName: string
  walletIcon: string
  assets?: AssetHoldingDisplay[]
  onAddNetwork: () => void
  onAddAsset: (asset: AssetHoldingDisplay) => void
  onBack: () => void
}

export function AddToWalletPanel({
  walletName,
  walletIcon,
  assets,
  onAddNetwork,
  onAddAsset,
  onBack,
}: AddToWalletPanelProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BackButton onClick={onBack} />
        <h3 className="text-lg font-bold leading-none text-[var(--wui-color-text)] wallet-custom-font">
          Add to {walletName}
        </h3>
      </div>

      {/* Add Algorand network card */}
      <div className="rounded-xl border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <img src={walletIcon} alt={`${walletName} icon`} width={20} height={20} className="object-contain" />
          <h4 className="text-sm font-medium text-[var(--wui-color-text)]">Algorand Network</h4>
        </div>
        <p className="text-xs text-[var(--wui-color-text-secondary)] leading-relaxed mb-3">
          Add Algorand as a custom network to {walletName} to view your ALGO balance.
        </p>
        <button
          onClick={onAddNetwork}
          className="w-full py-2.5 px-4 bg-[var(--wui-color-primary)] text-white font-medium rounded-xl hover:brightness-90 transition-all text-sm flex items-center justify-center gap-1.5"
        >
          <img src={walletIcon} alt={`${walletName} icon`} width={16} height={16} className="object-contain" />
          Add Algorand to {walletName}
        </button>
      </div>

      {/* Add individual assets */}
      {assets && assets.length > 0 && (
        <div className="rounded-xl border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] p-4">
          <h4 className="text-xs font-medium text-[var(--wui-color-text-secondary)] uppercase tracking-wide mb-1.5">
            Assets
          </h4>
          <p className="text-xs text-[var(--wui-color-text-secondary)] leading-relaxed mb-2">
            Add your opted-in assets as custom tokens in {walletName} so they appear in your wallet&apos;s token list.
          </p>
          {assets.map((asset) => (
            <div
              key={asset.assetId}
              className="flex justify-between items-center py-1"
            >
              <span className="text-sm text-[var(--wui-color-text-secondary)] truncate mr-3 flex items-center gap-1.5">
                {asset.name}{' '}
                <span className="text-[var(--wui-color-text-secondary)]">
                  (ID {asset.assetId})
                </span>
              </span>
              <button
                onClick={() => onAddAsset(asset)}
                className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text-secondary)] hover:brightness-90 transition-all"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
