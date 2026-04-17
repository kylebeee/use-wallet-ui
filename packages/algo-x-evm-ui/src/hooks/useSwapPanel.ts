import { useCallback, useEffect, useRef, useState } from 'react'
import type { CachedAsset } from '../cache/assetCache'
import type { AssetSearchProvider, WalletAdapter } from '../types'
import { useAssetLookup, type AssetLookupInfo } from './useAssetLookup'
import { useAssetNameSearch, type UseAssetNameSearchReturn } from './useAssetNameSearch'

/**
 * Minimal interface for Haystack Router's SwapQuote.
 * Avoids requiring @txnlab/haystack-router as a dependency.
 */
export interface SwapQuoteDisplay {
  /** Expected output amount in base units */
  quote: bigint
  /** Original input amount in base units */
  amount: bigint
  /** USD value of input */
  usdIn: number
  /** USD value of output */
  usdOut: number
  /** Price impact percentage */
  userPriceImpact?: number
  /** Protocol split percentages */
  flattenedRoute: Record<string, number>
  /** Detailed routing path */
  route: { percentage: number; path: { in: { unit_name: string }; out: { unit_name: string }; name: string }[] }[]
}

export interface SwapAsset {
  assetId: number
  name: string
  unitName: string
  decimals: number
  logo?: string | null
  verificationTier?: 'trusted' | 'verified' | 'suspicious' | 'unverified'
}

export type SwapStatusValue = 'idle' | 'quoting' | 'signing' | 'sending' | 'success' | 'error'

export interface UseSwapPanelReturn {
  activeAddress: string | null
  fromAssetId: string
  setFromAssetId: (id: string) => void
  toAssetId: string
  setToAssetId: (id: string) => void
  amount: string
  setAmount: (v: string) => void
  slippage: string
  setSlippage: (v: string) => void
  quote: SwapQuoteDisplay | null
  quoteLoading: boolean
  quoteError: string | null
  status: SwapStatusValue
  error: string | null
  txId: string | null
  swapDirection: () => void
  handleSwap: () => Promise<void>
  reset: () => void
  retry: () => void
  // Asset discovery (for swapping into assets the wallet doesn't already hold)
  searchInput: string
  setSearchInput: (v: string) => void
  searchLookupInfo: AssetLookupInfo | null
  searchLookupLoading: boolean
  searchLookupError: string | null
  searchNameResults: CachedAsset[]
  searchNameLoading: boolean
  registryLoading: boolean
  isNameMode: boolean
  /** Assets the user has discovered via search and selected as a swap target */
  discoveredAssets: SwapAsset[]
  /** Pick a discovered asset (from search results) as the destination */
  pickDiscoveredAsset: (asset: SwapAsset) => void
  /** Clear search state */
  clearSearch: () => void
}

export interface UseSwapPanelOptions {
  /** Function to fetch a quote. Consumers inject the RouterClient call. */
  fetchQuote: (params: {
    fromASAID: number
    toASAID: number
    amount: bigint
    address: string
  }) => Promise<SwapQuoteDisplay>
  /** Function to execute a swap. Consumers inject the RouterClient call.
   * Should call `onSigned` after the wallet has signed but before submission/confirmation,
   * so the panel can transition the status indicator from 'signing' to 'sending'. */
  executeSwap: (params: {
    quote: SwapQuoteDisplay
    address: string
    slippage: number
    onSigned?: () => void
  }) => Promise<{ confirmedRound: bigint; txIds: string[] }>
}

/** Mainnet USDC — used as the default destination asset. */
const DEFAULT_TO_ASSET: SwapAsset = {
  assetId: 31566704,
  name: 'USDC',
  unitName: 'USDC',
  decimals: 6,
}

/** No-op name search used when no AssetSearchProvider is given. */
const EMPTY_NAME_SEARCH: UseAssetNameSearchReturn = {
  nameInput: '',
  setNameInput: () => {},
  results: [],
  isSearching: false,
  selectedAsset: null,
  selectAsset: () => {},
  reset: () => {},
}

function isNumericInput(input: string): boolean {
  return /^\d*$/.test(input)
}

export function useSwapPanel(
  wallet: WalletAdapter,
  options: UseSwapPanelOptions,
  assets?: SwapAsset[],
  searchProvider?: AssetSearchProvider,
): UseSwapPanelReturn {
  const { activeAddress, algodClient, onTransactionSuccess } = wallet

  const [fromAssetId, setFromAssetId] = useState('0') // ALGO
  const [toAssetId, setToAssetId] = useState(String(DEFAULT_TO_ASSET.assetId))
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('1')
  const [quote, setQuote] = useState<SwapQuoteDisplay | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [status, setStatus] = useState<SwapStatusValue>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)

  // Asset discovery (search by ID or name for assets the wallet doesn't hold)
  const [searchRawInput, setSearchRawInput] = useState('')
  // Seed with default USDC so it's selectable even when the user hasn't opted in
  const [discoveredAssets, setDiscoveredAssets] = useState<SwapAsset[]>([DEFAULT_TO_ASSET])
  const lookup = useAssetLookup(algodClient)
  const nameSearchReal = useAssetNameSearch(searchProvider ?? { searchByName: async () => [], registryLoading: false })
  const nameSearch = searchProvider ? nameSearchReal : EMPTY_NAME_SEARCH
  const isNameMode = !isNumericInput(searchRawInput)

  const setSearchInput = useCallback(
    (value: string) => {
      setSearchRawInput(value)
      if (isNumericInput(value)) {
        lookup.setAssetIdInput(value)
        nameSearch.reset()
      } else {
        lookup.setAssetIdInput('')
        nameSearch.setNameInput(value)
      }
    },
    [lookup, nameSearch],
  )

  const clearSearch = useCallback(() => {
    setSearchRawInput('')
    lookup.reset()
    nameSearch.reset()
  }, [lookup, nameSearch])

  const pickDiscoveredAsset = useCallback((asset: SwapAsset) => {
    setDiscoveredAssets((prev) => {
      if (prev.some((a) => a.assetId === asset.assetId)) return prev
      return [...prev, asset]
    })
    setToAssetId(String(asset.assetId))
    setSearchRawInput('')
    lookup.reset()
    nameSearch.reset()
  }, [lookup, nameSearch])

  const quoteAbortRef = useRef(0)
  const fetchQuoteRef = useRef(options.fetchQuote)
  fetchQuoteRef.current = options.fetchQuote
  const executeSwapRef = useRef(options.executeSwap)
  executeSwapRef.current = options.executeSwap
  const assetsRef = useRef(assets)
  assetsRef.current = assets

  // Set default toAssetId from available assets
  // Debounced quote fetching
  useEffect(() => {
    setQuote(null)
    setQuoteError(null)

    const parsedAmount = parseFloat(amount)
    if (!activeAddress || !fromAssetId || !toAssetId || !amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return
    }
    if (fromAssetId === toAssetId) return

    const fromAsset = fromAssetId === '0' ? { decimals: 6 } : assetsRef.current?.find((a) => String(a.assetId) === fromAssetId)
    const decimals = fromAsset && 'decimals' in fromAsset ? fromAsset.decimals : 6

    const quoteId = ++quoteAbortRef.current
    setQuoteLoading(true)

    const timer = setTimeout(async () => {
      try {
        const baseUnits = BigInt(Math.floor(parsedAmount * 10 ** decimals))
        const result = await fetchQuoteRef.current({
          fromASAID: Number(fromAssetId),
          toASAID: Number(toAssetId),
          amount: baseUnits,
          address: activeAddress,
        })
        if (quoteAbortRef.current !== quoteId) return
        setQuote(result)
        setQuoteError(null)
      } catch (err) {
        if (quoteAbortRef.current !== quoteId) return
        setQuoteError(err instanceof Error ? err.message : 'Failed to get quote')
      } finally {
        if (quoteAbortRef.current === quoteId) setQuoteLoading(false)
      }
    }, 500)

    return () => {
      clearTimeout(timer)
      quoteAbortRef.current++
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress, fromAssetId, toAssetId, amount])

  const swapDirection = useCallback(() => {
    const prevFrom = fromAssetId
    const prevTo = toAssetId
    setFromAssetId(prevTo)
    setToAssetId(prevFrom)
    // Use the previous quote's output as the new input amount (the swap is flipped)
    if (quote) {
      const prevToAsset = prevTo === '0' ? { decimals: 6 } : assetsRef.current?.find((a) => String(a.assetId) === prevTo)
      const decimals = prevToAsset && 'decimals' in prevToAsset ? prevToAsset.decimals : 6
      const outputHuman = Number(quote.quote) / 10 ** decimals
      setAmount(outputHuman > 0 ? outputHuman.toString() : '')
    }
    setQuote(null)
    setQuoteError(null)
  }, [fromAssetId, toAssetId, quote])

  const reset = useCallback(() => {
    setFromAssetId('0')
    setToAssetId(String(DEFAULT_TO_ASSET.assetId))
    setAmount('')
    setSlippage('1')
    setQuote(null)
    setQuoteLoading(false)
    setQuoteError(null)
    setStatus('idle')
    setError(null)
    setTxId(null)
    setSearchRawInput('')
    setDiscoveredAssets([DEFAULT_TO_ASSET])
    lookup.reset()
    nameSearch.reset()
  }, [lookup, nameSearch])

  const retry = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const handleSwap = useCallback(async () => {
    if (!activeAddress || !quote) return

    setStatus('signing')
    setError(null)
    setTxId(null)

    try {
      const result = await executeSwapRef.current({
        quote,
        address: activeAddress,
        slippage: parseFloat(slippage) || 1,
        onSigned: () => setStatus('sending'),
      })

      onTransactionSuccess?.()

      setTxId(result.txIds[0] ?? null)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Swap failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress, quote, slippage, onTransactionSuccess])

  return {
    activeAddress: activeAddress ?? null,
    fromAssetId,
    setFromAssetId,
    toAssetId,
    setToAssetId,
    amount,
    setAmount,
    slippage,
    setSlippage,
    quote,
    quoteLoading,
    quoteError,
    status,
    error,
    txId,
    swapDirection,
    handleSwap,
    reset,
    retry,
    searchInput: searchRawInput,
    setSearchInput,
    searchLookupInfo: lookup.assetInfo,
    searchLookupLoading: lookup.isLoading,
    searchLookupError: lookup.error,
    searchNameResults: nameSearch.results,
    searchNameLoading: nameSearch.isSearching,
    registryLoading: searchProvider?.registryLoading ?? false,
    isNameMode,
    discoveredAssets,
    pickDiscoveredAsset,
    clearSearch,
  }
}
