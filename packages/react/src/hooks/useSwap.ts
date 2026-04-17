import { useWallet } from '@txnlab/use-wallet-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSwapPanel, type UseSwapPanelReturn, type UseSwapPanelOptions, type SwapAsset, type AssetSearchProvider } from '@d13co/algo-x-evm-ui'
import { useCallback, useMemo } from 'react'

export type { UseSwapPanelReturn as UseSwapReturn } from '@d13co/algo-x-evm-ui'

export interface UseSwapOptions {
  /** Function to fetch a quote from Haystack Router (or any swap router). */
  fetchQuote: UseSwapPanelOptions['fetchQuote']
  /** Function to execute a swap. Receives quote, address, and slippage. */
  executeSwap: UseSwapPanelOptions['executeSwap']
}

/**
 * Convenience wrapper around `useSwapPanel` that pulls wallet context
 * from `@txnlab/use-wallet-react` and invalidates React Query on success.
 */
export function useSwap(
  options: UseSwapOptions,
  assets?: SwapAsset[],
  searchProvider?: AssetSearchProvider,
): UseSwapPanelReturn {
  const { activeAddress, algodClient, signTransactions } = useWallet()
  const queryClient = useQueryClient()

  const onTransactionSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['account-info'] })
  }, [queryClient])

  const panelOptions = useMemo((): UseSwapPanelOptions => ({
    fetchQuote: options.fetchQuote,
    executeSwap: options.executeSwap,
  }), [options.fetchQuote, options.executeSwap])

  return useSwapPanel(
    {
      activeAddress: activeAddress ?? null,
      algodClient,
      signTransactions,
      onTransactionSuccess,
    },
    panelOptions,
    assets,
    searchProvider,
  )
}
