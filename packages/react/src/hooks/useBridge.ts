import { useWallet } from '@txnlab/use-wallet-react'
import { useQueryClient } from '@tanstack/react-query'
import { useBridgePanel, type UseBridgePanelReturn, type UseBridgeOptions } from '@d13co/algo-x-evm-ui'
import { useCallback } from 'react'
import { type EIP1193Provider } from '../services/evmProviderAdapter'

// Re-export types from the shared package for backward compat
export type { UseBridgeOptions, BridgeChain, BridgeToken, BridgeStatus } from '@d13co/algo-x-evm-ui'
export type { BridgeHookTransferStatus as BridgeTransferStatus } from '@d13co/algo-x-evm-ui'
export { BRIDGE_PERSIST_KEY } from '@d13co/algo-x-evm-ui'

export type UseBridgeReturn = UseBridgePanelReturn

/**
 * Convenience wrapper around `useBridgePanel` that pulls wallet context
 * from `@txnlab/use-wallet-react` and invalidates React Query on success.
 */
export function useBridge(options: UseBridgeOptions = {}): UseBridgePanelReturn {
  const { activeAddress, activeWallet, algodClient, signTransactions } = useWallet()
  const queryClient = useQueryClient()

  const onTransactionSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['account-info'] })
    queryClient.invalidateQueries({ queryKey: ['account-balance'] })
  }, [queryClient])

  // Extract EVM-specific fields from wallet metadata
  // @ts-ignore - metadata exists on AlgoXEvmBaseWallet accounts
  const evmAddress: string | null = (activeWallet?.activeAccount?.metadata?.evmAddress as string) ?? null
  // @ts-ignore - isAlgoXEvm exists on Algo x EVM wallet metadata
  const isAlgoXEvm = !!activeWallet?.metadata?.isAlgoXEvm

  const getEvmProvider = (activeWallet as unknown as Record<string, unknown>)?.getEvmProvider as
    | (() => Promise<EIP1193Provider>)
    | undefined

  return useBridgePanel(
    {
      activeAddress: activeAddress ?? null,
      algodClient,
      signTransactions,
      onTransactionSuccess,
      evmAddress,
      isAlgoXEvm,
      getEvmProvider,
    },
    options,
  )
}
