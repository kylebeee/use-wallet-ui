import { useState } from 'react'
import type { CachedAsset } from '../cache/assetCache'
import { CopyButton } from './CopyButton'
import { Spinner } from './Spinner'
import { TransactionStatus, type TransactionStatusValue } from './TransactionStatus'

export interface ReceivePanelProps {
  activeAddress?: string | null
  optedInAssetIds?: Set<number>
  assetIdInput: string
  setAssetIdInput: (v: string) => void
  assetInfo: { name: string; unitName: string; index: number } | null
  assetLookupLoading: boolean
  assetLookupError: string | null
  txId?: string | null
  explorerUrl?: string | null
  status: TransactionStatusValue
  error: string | null
  handleOptIn: () => void
  reset: () => void
  retry: () => void
  onBack: () => void
  // Name search props (optional for backward-compat)
  nameSearchResults?: CachedAsset[]
  nameSearchLoading?: boolean
  registryLoading?: boolean
  selectedNameAsset?: CachedAsset | null
  onSelectNameAsset?: (asset: CachedAsset) => void
  isNameMode?: boolean
  evmAddress?: string | null
  onOptOut?: (assetIndex: number) => void
}

export function ReceivePanel({
  activeAddress,
  optedInAssetIds,
  assetIdInput,
  setAssetIdInput,
  assetInfo,
  assetLookupLoading,
  assetLookupError,
  txId,
  explorerUrl,
  status,
  error,
  handleOptIn,
  reset: _reset,
  retry,
  onBack,
  nameSearchResults,
  nameSearchLoading,
  registryLoading,
  selectedNameAsset,
  onSelectNameAsset,
  isNameMode,
  evmAddress,
  onOptOut,
}: ReceivePanelProps) {
  const [evmExpanded, setEvmExpanded] = useState(false)

  // Check if the resolved asset is already opted in
  const resolvedAssetIndex = isNameMode ? selectedNameAsset?.index : assetInfo?.index
  const isAlreadyOptedIn = resolvedAssetIndex != null && optedInAssetIds?.has(resolvedAssetIndex)

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="-ml-1 p-1 rounded-lg hover:bg-[var(--wui-color-bg-secondary)] transition-colors text-[var(--wui-color-text-secondary)] flex items-center justify-center"
          title="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h3 className="text-lg font-bold leading-none text-[var(--wui-color-text)] wallet-custom-font">Receive</h3>
        {registryLoading && (
          <div className="ml-auto flex items-center gap-1 text-xs text-[var(--wui-color-text-secondary)]">
            <Spinner className="h-3 w-3" />
            <span>Loading registry</span>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--wui-color-text-secondary)] mb-2 leading-relaxed">
        This is your Algo x EVM account. You can receive ALGO and any opted-in assets here, and manage your asset opt-ins below.
      </p>

      {/* Address display */}
      {activeAddress && (
        <div className="mb-4 bg-[var(--wui-color-bg-secondary)] rounded-lg p-3">
          <p className="text-xs text-[var(--wui-color-text-secondary)] mb-1.5">Your ALGO x EVM address:</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-medium text-[var(--wui-color-text)] flex-1 truncate">{activeAddress}</code>
            <CopyButton text={activeAddress} />
          </div>
        </div>
      )}

      {/* EVM Controller display (collapsible) */}
      {evmAddress && (
        <>
          <p className="text-xs text-[var(--wui-color-text-secondary)] mb-2 leading-relaxed">
            It is controlled entirely by your EVM account:
          </p>

          <div className="mb-2 bg-[var(--wui-color-bg-secondary)] rounded-lg">
            <button
              type="button"
              onClick={() => setEvmExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-[var(--wui-color-text-secondary)] hover:text-[var(--wui-color-text)] transition-colors focus:outline-none"
            >
              <span>EVM Controller</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: evmExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {evmExpanded && (
              <div className="px-3 pb-2.5">
                <code className="text-sm font-medium text-[var(--wui-color-text)] truncate block">{evmAddress}</code>
              </div>
            )}
          </div>
        </>
      )}

      <h4 className="text-base font-bold leading-none text-[var(--wui-color-text)] wallet-custom-font mt-6 mb-3">Asset opt-in</h4>

      {/* Opt-in search (hidden during/after transaction) */}
      {status === 'idle' && (
        <>
          {/* Opt-in explanation */}
          <p className="text-xs text-[var(--wui-color-text-secondary)] mb-3 leading-relaxed">
            Algorand accounts must opt in to assets before receiving them. Search for an asset below to opt in.
          </p>

          {/* Unified search input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or asset ID"
              value={assetIdInput}
              onChange={(e) => setAssetIdInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] py-2.5 px-3 text-sm text-[var(--wui-color-text)] placeholder:text-[var(--wui-color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--wui-color-primary)] focus:border-transparent"
            />
          </div>

          {/* ID mode: Loading */}
          {!isNameMode && assetLookupLoading && (
            <div className="flex items-center justify-center py-4 text-sm text-[var(--wui-color-text-secondary)]">
              <Spinner className="h-4 w-4 mr-2" />
              Looking up asset
            </div>
          )}

          {/* ID mode: Lookup error */}
          {!isNameMode && assetLookupError && (
            <div className="py-3 text-center text-sm text-[var(--wui-color-danger-text)] break-words">{assetLookupError}</div>
          )}

          {/* ID mode: Asset result */}
          {!isNameMode && assetInfo && (
            <AssetCard
              name={assetInfo.name}
              unitName={assetInfo.unitName}
              index={assetInfo.index}
              isAlreadyOptedIn={isAlreadyOptedIn}
              onOptIn={handleOptIn}
              onOptOut={onOptOut}
            />
          )}

          {/* Name mode: Loading */}
          {isNameMode && nameSearchLoading && (
            <div className="flex items-center justify-center py-4 text-sm text-[var(--wui-color-text-secondary)]">
              <Spinner className="h-4 w-4 mr-2" />
              Searching
            </div>
          )}

          {/* Name mode: Results list */}
          {isNameMode && !selectedNameAsset && nameSearchResults && nameSearchResults.length > 0 && !nameSearchLoading && (
            <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[var(--wui-color-border)]">
              {nameSearchResults.map((asset) => (
                <button
                  key={asset.index}
                  onClick={() => onSelectNameAsset?.(asset)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--wui-color-bg-secondary)] transition-colors border-b border-[var(--wui-color-border)] last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--wui-color-text)] truncate">
                        {asset.name}
                        {asset.peraVerified && <VerifiedBadge />}
                        {optedInAssetIds?.has(asset.index) && (
                          <span className="ml-1.5 text-xs text-[var(--wui-color-text-secondary)]">(opted in)</span>
                        )}
                      </p>
                      {asset.unitName && <p className="text-xs text-[var(--wui-color-text-secondary)]">{asset.unitName}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--wui-color-text-secondary)] shrink-0 ml-2">ID: {asset.index}</span>
                </button>
              ))}
            </div>
          )}

          {/* Name mode: No results */}
          {isNameMode &&
            !selectedNameAsset &&
            nameSearchResults &&
            nameSearchResults.length === 0 &&
            !nameSearchLoading &&
            assetIdInput.trim().length > 0 && (
              <div className="py-3 text-center text-sm text-[var(--wui-color-text-secondary)]">No assets found</div>
            )}

          {/* Name mode: Selected asset confirmation */}
          {isNameMode && selectedNameAsset && (
            <AssetCard
              name={selectedNameAsset.name}
              unitName={selectedNameAsset.unitName}
              index={selectedNameAsset.index}
              peraVerified={selectedNameAsset.peraVerified}
              isAlreadyOptedIn={isAlreadyOptedIn}
              onOptIn={handleOptIn}
              onOptOut={onOptOut}
            />
          )}
        </>
      )}

      <TransactionStatus
        status={status}
        error={error}
        successMessage="Opted in successfully!"
        onRetry={retry}
        txId={txId}
        explorerUrl={explorerUrl}
      />

      {status === 'success' && (
        <button onClick={onBack} className="mt-3 w-full py-2.5 px-4 bg-[var(--wui-color-primary)] text-[var(--wui-color-primary-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm">
          Back
        </button>
      )}
    </>
  )
}

function VerifiedBadge() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="var(--wui-color-primary)"
      className="inline-block ml-1 -mt-0.5"
    >
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function AssetCard({
  name,
  unitName,
  index,
  peraVerified,
  isAlreadyOptedIn,
  onOptIn,
  onOptOut,
}: {
  name: string
  unitName?: string
  index: number
  peraVerified?: boolean
  isAlreadyOptedIn?: boolean
  onOptIn: () => void
  onOptOut?: (assetIndex: number) => void
}) {
  return (
    <div className="bg-[var(--wui-color-bg-secondary)] rounded-lg p-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm font-medium text-[var(--wui-color-text)]">
            {name}
            {peraVerified && <VerifiedBadge />}
          </p>
          {unitName && <p className="text-xs text-[var(--wui-color-text-secondary)]">{unitName}</p>}
        </div>
        <span className="text-xs text-[var(--wui-color-text-secondary)]">ID: {index}</span>
      </div>
      {isAlreadyOptedIn ? (
        <div className="text-center">
          <p className="text-xs text-[var(--wui-color-text-secondary)] py-1">Already opted in — no action needed.</p>
          {onOptOut && (
            <button
              onClick={() => onOptOut(index)}
              className="mt-2 w-full py-2 px-4 border border-[var(--wui-color-border)] text-[var(--wui-color-text-secondary)] font-medium rounded-xl hover:brightness-90 transition-all text-sm"
            >
              Opt out of {unitName || name}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onOptIn}
          className="w-full py-2 px-4 bg-[var(--wui-color-primary)] text-[var(--wui-color-primary-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm"
        >
          Opt In
        </button>
      )}
    </div>
  )
}
