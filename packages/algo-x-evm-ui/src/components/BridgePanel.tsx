import { useEffect, useState } from 'react'
import { BackButton } from './BackButton'
import { CopyButton } from './CopyButton'
import { ExternalLinkIcon } from './ExternalLinkIcon'
import { CheckCircleFilled, XCircleFilled } from './icons'
import { Spinner } from './Spinner'

export interface BridgeChainDisplay {
  chainSymbol: string
  chainName: string
  tokens: BridgeTokenDisplay[]
}

export interface BridgeTokenDisplay {
  symbol: string
  name: string
  decimals?: number
  chainSymbol: string
  chainName: string
  /** Raw balance in smallest token units (decimal string). Undefined while loading. */
  balance?: string
}

export type BridgeStatusValue =
  | 'idle'
  | 'loading-chains'
  | 'quoting'
  | 'permit-signing'
  | 'approving'
  | 'bundling'
  | 'signing'
  | 'sending'
  | 'opting-in'
  | 'waiting'
  | 'watching-funding'
  | 'opt-in-sent'
  | 'success'
  | 'error'

export interface BridgePanelProps {
  // Chain/token selection
  chains: BridgeChainDisplay[]
  chainsLoading: boolean
  balancesLoading?: boolean
  sourceChainSymbol: string | null
  onSourceChainChange: (symbol: string) => void
  sourceTokenSymbol: string | null
  onSourceTokenChange: (symbol: string) => void
  destinationChains?: BridgeChainDisplay[]
  destinationChainSymbol?: string | null
  onDestinationChainChange?: (symbol: string) => void
  sourceIsAlgorand?: boolean
  destinationTokenSymbol: string | null
  destinationTokens: BridgeTokenDisplay[]
  onDestinationTokenChange: (symbol: string) => void

  // Amount
  amount: string
  onAmountChange: (v: string) => void
  receivedAmount: string | null
  quoteLoading: boolean

  // Fee
  gasFee: string | null
  gasFeeLoading: boolean
  gasFeeUnit: string | null
  /** Approximate ALGO the user will receive from extra gas (e.g. "~0.123 ALGO") */
  extraGasAlgo: string | null

  // Addresses
  evmAddress: string | null
  algorandAddress: string | null

  // Transfer tracking
  estimatedTimeMs: number | null
  waitingSince: number | null
  transferStatus: BridgeTransferStatus | null

  // Opt-in tracking
  optInNeeded: boolean
  optInSigned: boolean
  watchingForFunding: boolean
  optInConfirmed: boolean

  // Status
  status: BridgeStatusValue
  error: string | null
  sourceTxId: string | null
  destinationTxId?: string | null

  // Actions
  onBridge: () => void
  onReset: () => void
  onRetry: () => void
  onBack?: () => void

  /** Hide the built-in header (useful when the parent provides its own) */
  hideHeader?: boolean

  /** Auto-focus the source chain dropdown when mounted */
  autoFocusAmount?: boolean
}

export interface BridgeTransferStatus {
  sendConfirmations: number
  sendConfirmationsNeeded: number
  signaturesCount: number
  signaturesNeeded: number
  receiveConfirmations: number | null
  receiveConfirmationsNeeded: number | null
}

function formatShortAddr(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/** Format a raw balance string (smallest units) to a human-readable number with up to 2 decimal places */
function formatTokenBalance(rawBalance: string, decimals: number): string {
  if (decimals === 0) return rawBalance
  const padded = rawBalance.padStart(decimals + 1, '0')
  const whole = padded.slice(0, -decimals) || '0'
  const frac = padded.slice(-decimals).slice(0, 2).replace(/0+$/, '')
  const formatted = frac ? `${whole}.${frac}` : whole
  // Add thousands separators to the whole part
  const [w, f] = formatted.split('.')
  const withCommas = w.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return f ? `${withCommas}.${f}` : withCommas
}

/** Get a display label for a chain, appending token balance if available */
function chainOptionLabel(chain: BridgeChainDisplay): string {
  // Find the first token with a non-zero balance to show
  for (const t of chain.tokens) {
    if (t.balance && t.balance !== '0' && t.decimals != null) {
      const formatted = formatTokenBalance(t.balance, t.decimals)
      return `${chain.chainName} (${formatted} ${t.symbol})`
    }
  }
  return chain.chainName
}

function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function BridgePanel({
  chains,
  chainsLoading,
  sourceChainSymbol,
  onSourceChainChange,
  sourceTokenSymbol,
  onSourceTokenChange,
  destinationChains = [],
  destinationChainSymbol,
  onDestinationChainChange,
  sourceIsAlgorand = false,
  destinationTokenSymbol,
  destinationTokens,
  onDestinationTokenChange,
  amount,
  onAmountChange,
  receivedAmount,
  quoteLoading,
  gasFee,
  gasFeeLoading,
  gasFeeUnit,
  extraGasAlgo,
  evmAddress,
  algorandAddress,
  estimatedTimeMs,
  waitingSince,
  transferStatus,
  optInNeeded,
  optInSigned,
  watchingForFunding,
  optInConfirmed,
  status,
  error,
  sourceTxId,
  destinationTxId,
  onBridge,
  onReset,
  onRetry,
  // balancesLoading is available via props for consumers who want loading indicators
  onBack,
  hideHeader,
  autoFocusAmount,
}: BridgePanelProps) {
  const sourceChain = chains.find((c) => c.chainSymbol === sourceChainSymbol) ?? null
  const sourceTokens = sourceChain?.tokens ?? []
  const selectedSourceToken = sourceTokens.find((t) => t.symbol === sourceTokenSymbol) ?? null

  // Compute human-readable balance for the selected source token
  const sourceBalanceFloat =
    selectedSourceToken?.balance != null && selectedSourceToken.decimals != null
      ? parseFloat(selectedSourceToken.balance) / 10 ** selectedSourceToken.decimals
      : null

  const parsedAmount = amount ? parseFloat(amount) : 0
  const insufficientFunds = sourceBalanceFloat != null && parsedAmount > 0 && parsedAmount > sourceBalanceFloat

  const isProcessing =
    status === 'permit-signing' ||
    status === 'approving' ||
    status === 'bundling' ||
    status === 'signing' ||
    status === 'sending' ||
    status === 'opting-in' ||
    status === 'waiting' ||
    status === 'watching-funding' ||
    status === 'opt-in-sent'

  const canSubmit =
    status === 'idle' &&
    sourceChainSymbol &&
    sourceTokenSymbol &&
    destinationTokenSymbol &&
    amount &&
    parsedAmount > 0 &&
    !insufficientFunds &&
    (sourceIsAlgorand ? algorandAddress : evmAddress && algorandAddress)

  return (
    <>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center gap-2 mb-4">
          {onBack && (
            <BackButton onClick={onBack} disabled={isProcessing} />
          )}
          <h3 className="text-lg font-bold leading-none text-[var(--wui-color-text)] wallet-custom-font">Bridge</h3>
        </div>
      )}

      {/* Loading chains */}
      {chainsLoading && (
        <div className="flex items-center justify-center py-8 text-sm text-[var(--wui-color-text-secondary)]">
          <Spinner className="h-4 w-4 mr-2" />
          Loading bridge routes
        </div>
      )}

      {/* No chains available */}
      {!chainsLoading && status === 'idle' && chains.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--wui-color-text-secondary)] mb-2">Bridge routes are currently unavailable.</p>
          <button onClick={onRetry} className="text-sm text-[var(--wui-color-primary)] hover:underline">
            Try again
          </button>
        </div>
      )}

      {/* Form (visible in idle state only) */}
      {!chainsLoading && status === 'idle' && chains.length > 0 && (
        <>
          <p className="text-xs text-[var(--wui-color-text-tertiary)] mb-3">
            {sourceIsAlgorand
              ? 'Bridge tokens from Algorand to your EVM accounts using Allbridge'
              : 'Bridge tokens from your EVM accounts using Allbridge'}
          </p>

          {/* Source: Chain + Token selectors */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--wui-color-text-secondary)] mb-1">
              From
              {sourceIsAlgorand
                ? algorandAddress
                  ? ` ${formatShortAddr(algorandAddress)}`
                  : ''
                : evmAddress
                  ? ` ${formatShortAddr(evmAddress)}`
                  : ''}{' '}
              on
            </label>
            <div className="flex gap-2">
              <select
                value={sourceChainSymbol ?? ''}
                onChange={(e) => onSourceChainChange(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] py-2.5 px-2 text-sm text-[var(--wui-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--wui-color-primary)] focus:border-transparent"
              >
                {chains.map((c) => (
                  <option key={c.chainSymbol} value={c.chainSymbol}>
                    {chainOptionLabel(c)}
                  </option>
                ))}
              </select>
              <select
                value={sourceTokenSymbol ?? ''}
                onChange={(e) => onSourceTokenChange(e.target.value)}
                className="w-[100px] shrink-0 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] py-2.5 px-2 text-sm text-[var(--wui-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--wui-color-primary)] focus:border-transparent"
              >
                {sourceTokens.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--wui-color-text-secondary)] mb-1">Amount</label>
            <input
              autoFocus={autoFocusAmount}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.]/g, ''))}
              className={`w-full rounded-lg border bg-[var(--wui-color-bg-secondary)] py-2.5 px-3 text-sm text-[var(--wui-color-text)] placeholder:text-[var(--wui-color-text-tertiary)] focus:outline-none focus:ring-2 focus:border-transparent ${insufficientFunds ? 'border-red-500 focus:ring-red-500/30' : 'border-[var(--wui-color-border)] focus:ring-[var(--wui-color-primary)]'}`}
            />
            {insufficientFunds && (
              <p className="mt-1 text-xs text-red-500">
                Insufficient balance
                {sourceBalanceFloat != null ? ` (${sourceBalanceFloat.toFixed(2)} ${sourceTokenSymbol ?? ''} available)` : ''}
              </p>
            )}
          </div>

          {/* Destination: chain + token */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--wui-color-text-secondary)] mb-1">
              To
              {!sourceIsAlgorand
                ? algorandAddress
                  ? ` ${formatShortAddr(algorandAddress)}`
                  : ''
                : evmAddress
                  ? ` ${formatShortAddr(evmAddress)}`
                  : ''}{' '}
              on
            </label>
            <div className="flex gap-2 items-center">
              {destinationChains.length > 0 && onDestinationChainChange ? (
                <select
                  value={destinationChainSymbol ?? ''}
                  onChange={(e) => onDestinationChainChange(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] py-2.5 px-2 text-sm text-[var(--wui-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--wui-color-primary)] focus:border-transparent"
                >
                  {destinationChains.map((c) => (
                    <option key={c.chainSymbol} value={c.chainSymbol}>
                      {c.chainName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex-1 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] py-2.5 px-3 text-sm text-[var(--wui-color-text-secondary)]">
                  Algorand
                </div>
              )}
              <select
                value={destinationTokenSymbol ?? ''}
                onChange={(e) => onDestinationTokenChange(e.target.value)}
                className="w-[100px] shrink-0 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] py-2.5 px-2 text-sm text-[var(--wui-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--wui-color-primary)] focus:border-transparent"
              >
                {destinationTokens.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated receive */}
          <div className="mb-3 rounded-lg bg-[var(--wui-color-bg-secondary)] p-3 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--wui-color-text-secondary)]">You receive</span>
              <span className="text-[var(--wui-color-text-secondary)]">
                {quoteLoading ? (
                  <Spinner className="h-3 w-3 inline" />
                ) : receivedAmount ? (
                  `${receivedAmount} ${destinationTokenSymbol ?? ''}`
                ) : (
                  '--'
                )}
              </span>
            </div>
            {extraGasAlgo && (
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-[var(--wui-color-text-secondary)]">You receive (extra gas)</span>
                <span className="text-[var(--wui-color-text-secondary)]">{extraGasAlgo}</span>
              </div>
            )}
            {gasFee && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--wui-color-text-secondary)]">Network fee</span>
                <span className="text-[var(--wui-color-text-secondary)]">
                  {gasFeeLoading ? <Spinner className="h-2.5 w-2.5 inline" /> : `${gasFee}${gasFeeUnit ? ` ${gasFeeUnit}` : ''}`}
                </span>
              </div>
            )}
            {estimatedTimeMs != null && estimatedTimeMs > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--wui-color-text-secondary)]">Estimated time</span>
                <span className="text-[var(--wui-color-text-secondary)]">~{formatTimeRemaining(estimatedTimeMs)}</span>
              </div>
            )}
          </div>

          {/* Bridge button */}
          <button
            onClick={onBridge}
            disabled={!canSubmit}
            className="w-full py-2.5 px-4 bg-[var(--wui-color-primary)] text-[var(--wui-color-primary-text)] font-medium rounded-xl hover:brightness-90 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bridge
          </button>
        </>
      )}

      {/* Processing states */}
      {(status === 'permit-signing' || status === 'approving' || status === 'bundling' || status === 'signing') && (
        <div className="flex items-center justify-center py-6 text-sm text-[var(--wui-color-text-secondary)]">
          <Spinner className="h-4 w-4 mr-2" />
          {status === 'permit-signing'
            ? 'Signing permit'
            : status === 'approving'
              ? 'Checking capabilities'
              : status === 'bundling'
                ? 'Confirm approval + bridge in wallet'
                : 'Confirm in wallet'}
        </div>
      )}

      {status === 'opting-in' && !sourceIsAlgorand && (
        <div className="flex items-center justify-center py-6 text-sm text-[var(--wui-color-text-secondary)]">
          <Spinner className="h-4 w-4 mr-2" />
          Sign USDC opt-in for Algorand
        </div>
      )}

      {status === 'sending' && (
        <div className="flex items-center justify-center py-6 text-sm text-[var(--wui-color-text-secondary)]">
          <Spinner className="h-4 w-4 mr-2" />
          Sending bridge transaction
        </div>
      )}

      {/* Waiting / progress */}
      {(status === 'waiting' || status === 'watching-funding' || status === 'opt-in-sent') && (
        <BridgeProgress
          amount={amount}
          sourceTokenSymbol={sourceTokenSymbol}
          sourceChainName={sourceChain?.chainName ?? null}
          destinationChainName={destinationChains.find((c) => c.chainSymbol === destinationChainSymbol)?.chainName ?? null}
          transferStatus={transferStatus}
          estimatedTimeMs={estimatedTimeMs}
          waitingSince={waitingSince}
          optInNeeded={optInNeeded}
          optInSigned={optInSigned}
          watchingForFunding={watchingForFunding}
          optInConfirmed={optInConfirmed}
          sourceTxId={sourceTxId}
          explorerAddress={sourceIsAlgorand ? algorandAddress : evmAddress}
        />
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="text-center py-4">
          <CheckCircleFilled className="h-8 w-8 mx-auto mb-2 text-green-500" />
          {receivedAmount && destinationTokenSymbol && (
            <p className="mt-1.5 text-sm text-[var(--wui-color-text-secondary)]">
              {sourceChainSymbol === 'ALG' ? 'Sent' : 'Received'}{' '}
              <span className="font-medium text-[var(--wui-color-text)]">
                {receivedAmount} {destinationTokenSymbol}
              </span>
            </p>
          )}
          {sourceTxId && (
            <p className="mt-1.5 text-xs text-[var(--wui-color-text-tertiary)] flex items-center justify-center gap-1">
              Source TX: <span className="font-mono">{formatShortAddr(sourceTxId)}</span>
              <CopyButton text={sourceTxId} variant="icon" title="Copy transaction ID" />
            </p>
          )}
          {destinationTxId && (
            <p className="mt-1 text-xs text-[var(--wui-color-text-tertiary)] flex items-center justify-center gap-1">
              Destination TX:{' '}
              {destinationChainSymbol === 'ALG' ? (
                <a
                  href={`https://allo.info/tx/${destinationTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[var(--wui-color-primary)] hover:underline"
                >
                  {formatShortAddr(destinationTxId)}
                </a>
              ) : (
                <>
                  <span className="font-mono">{formatShortAddr(destinationTxId)}</span>
                  <CopyButton text={destinationTxId} variant="icon" title="Copy destination transaction ID" />
                </>
              )}
            </p>
          )}

          {(evmAddress || algorandAddress) && (
            <p className="mt-1 text-xs">
              <a
                href={`https://core.allbridge.io/explorer/address/${sourceIsAlgorand ? algorandAddress : evmAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--wui-color-primary)] hover:underline inline-flex items-center gap-1"
              >
                Allbridge Explorer <ExternalLinkIcon />
              </a>
            </p>
          )}
          <button onClick={onReset} className="mt-3 text-sm text-[var(--wui-color-primary)] hover:underline">
            Close
          </button>
        </div>
      )}

      {/* Error panel */}
      {status === 'error' && (
        <div className="text-center py-4">
          <XCircleFilled className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="text-sm font-medium text-[var(--wui-color-text)] mb-1">Bridge failed</p>
          {error && <p className="text-xs text-red-500 break-words mb-1.5">{error}</p>}
          {sourceTxId && (
            <p className="text-xs text-[var(--wui-color-text-tertiary)] flex items-center justify-center gap-1">
              TX: <span className="font-mono">{formatShortAddr(sourceTxId)}</span>
              <CopyButton text={sourceTxId} variant="icon" title="Copy transaction ID" />
            </p>
          )}
          <button onClick={onRetry} className="mt-3 text-sm text-[var(--wui-color-primary)] hover:underline">
            Try again
          </button>
        </div>
      )}
    </>
  )
}

// -- Bridge progress sub-component --

interface BridgeProgressProps {
  amount: string
  sourceTokenSymbol: string | null
  sourceChainName: string | null
  destinationChainName: string | null
  transferStatus: BridgeTransferStatus | null
  estimatedTimeMs: number | null
  waitingSince: number | null
  optInNeeded: boolean
  optInSigned: boolean
  watchingForFunding: boolean
  optInConfirmed: boolean
  sourceTxId: string | null
  explorerAddress: string | null
}

function CheckIcon() {
  return <CheckCircleFilled className="h-3.5 w-3.5 text-green-500 shrink-0" />
}

function Countdown({ estimatedTimeMs, waitingSince }: { estimatedTimeMs: number; waitingSince: number }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const elapsed = now - waitingSince
  const remaining = Math.max(0, estimatedTimeMs - elapsed)

  return (
    <p className="text-center text-xs text-[var(--wui-color-text-tertiary)] mt-3">
      {remaining <= 0 ? 'Arriving about now' : `~${formatTimeRemaining(remaining)} remaining`}
    </p>
  )
}

function BridgeProgress({
  amount,
  sourceTokenSymbol,
  sourceChainName,
  destinationChainName,
  transferStatus,
  estimatedTimeMs,
  waitingSince,
  optInNeeded,
  optInSigned,
  watchingForFunding,
  optInConfirmed,
  sourceTxId,
  explorerAddress,
}: BridgeProgressProps) {
  const sendDone =
    transferStatus != null &&
    transferStatus.sendConfirmationsNeeded > 0 &&
    transferStatus.sendConfirmations >= transferStatus.sendConfirmationsNeeded
  const sigsDone =
    transferStatus != null && transferStatus.signaturesNeeded > 0 && transferStatus.signaturesCount >= transferStatus.signaturesNeeded
  const receiveDone =
    transferStatus?.receiveConfirmations != null &&
    transferStatus.receiveConfirmationsNeeded != null &&
    transferStatus.receiveConfirmations >= transferStatus.receiveConfirmationsNeeded

  return (
    <div className="py-4 flex flex-col">
      {/* Header */}
      <p className="text-sm text-[var(--wui-color-text)] text-center mb-2">
        Bridging {amount} {sourceTokenSymbol ?? 'USDC'} from {sourceChainName ?? 'EVM'} to {destinationChainName ?? 'Algorand'} using{' '}
        <a
          href="https://allbridge.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--wui-color-primary)] hover:underline"
        >
          Allbridge
        </a>
      </p>

      <p className="text-sm text-[var(--wui-color-text-secondary)] text-center mb-4">
        You can safely minimize this dialog and browse, just stay within the site to ensure your transaction completes as expected.
      </p>

      <div className="inline-flex flex-col gap-3 self-center">
        {/* Source confirmations */}
        <div className="flex items-center gap-2 text-xs">
          {sendDone ? <CheckIcon /> : <Spinner className="h-3.5 w-3.5 shrink-0" />}
          <span className="text-[var(--wui-color-text-secondary)]">
            Source confirmation
            {transferStatus && !sendDone && (
              <span className="ml-1 text-[var(--wui-color-text-tertiary)]">
                {transferStatus.sendConfirmations}/{transferStatus.sendConfirmationsNeeded}
              </span>
            )}
          </span>
        </div>

        {/* Validator signatures */}
        <div className="flex items-center gap-2 text-xs">
          {sigsDone ? (
            <CheckIcon />
          ) : sendDone ? (
            <Spinner className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--wui-color-border)]" />
          )}
          <span className="text-[var(--wui-color-text-secondary)]">
            Validator signatures
            {transferStatus && sendDone && !sigsDone && (
              <span className="ml-1 text-[var(--wui-color-text-tertiary)]">
                {transferStatus.signaturesCount}/{transferStatus.signaturesNeeded}
              </span>
            )}
          </span>
        </div>

        {/* Opt-in status (conditional) */}
        {optInNeeded && (
          <div className="flex items-center gap-2 text-xs">
            {optInConfirmed ? (
              <CheckIcon />
            ) : watchingForFunding ? (
              <Spinner className="h-3.5 w-3.5 shrink-0" />
            ) : optInSigned ? (
              <Spinner className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--wui-color-border)]" />
            )}
            <span className="text-[var(--wui-color-text-secondary)]">
              {optInConfirmed
                ? 'USDC opt-in confirmed'
                : watchingForFunding
                  ? 'Waiting to opt in'
                  : optInSigned
                    ? 'Submitting opt-in'
                    : 'USDC opt-in pending'}
            </span>
          </div>
        )}

        {/* Destination delivery */}
        <div className="flex items-center gap-2 text-xs">
          {receiveDone ? (
            <CheckIcon />
          ) : sendDone && sigsDone ? (
            <Spinner className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--wui-color-border)]" />
          )}
          <span className="text-[var(--wui-color-text-secondary)]">
            Destination delivery
            {transferStatus?.receiveConfirmations != null && transferStatus.receiveConfirmationsNeeded != null && !receiveDone && (
              <span className="ml-1 text-[var(--wui-color-text-tertiary)]">
                {transferStatus.receiveConfirmations}/{transferStatus.receiveConfirmationsNeeded}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ETA countdown */}
      {estimatedTimeMs != null && waitingSince != null && !receiveDone && (
        <Countdown estimatedTimeMs={estimatedTimeMs} waitingSince={waitingSince} />
      )}

      {/* Source transaction ID */}
      {sourceTxId && (
        <div className="flex items-center justify-center text-xs text-[var(--wui-color-text-tertiary)] mt-3 gap-0.5">
          <span>
            Source TX: <span className="font-mono">{formatShortAddr(sourceTxId)}</span>
          </span>
          <CopyButton text={sourceTxId} variant="icon" title="Copy transaction ID" />
        </div>
      )}

      {explorerAddress && (
        <div className="flex items-center justify-center text-xs text-[var(--wui-color-text-tertiary)] mt-3 gap-0.5">
          <a
            href={`https://core.allbridge.io/explorer/address/${explorerAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-0.5 p-0.5 rounded hover:bg-[var(--wui-color-bg-secondary)] text-[var(--wui-color-text-tertiary)] hover:text-[var(--wui-color-text-secondary)] transition-colors"
            title="View on Allbridge Explorer"
          >
            View on Allbridge <ExternalLinkIcon />
          </a>
        </div>
      )}
    </div>
  )
}
