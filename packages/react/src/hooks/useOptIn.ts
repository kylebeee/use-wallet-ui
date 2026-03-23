import { useWallet } from '@txnlab/use-wallet-react'
import { useQueryClient } from '@tanstack/react-query'
import { useReceivePanel, type UseReceivePanelReturn } from '@d13co/algo-x-evm-ui'
import { useCallback } from 'react'

import { type UseAssetRegistryReturn } from './useAssetRegistry'

export type { UseReceivePanelReturn as UseOptInReturn } from '@d13co/algo-x-evm-ui'

/**
 * Convenience wrapper around `useReceivePanel` that pulls wallet context
 * from `@txnlab/use-wallet-react` and invalidates React Query on success.
 */
export function useOptIn(registry: UseAssetRegistryReturn, optedInAssetIds: Set<number> = new Set()): UseReceivePanelReturn {
  const { activeAddress, algodClient, signTransactions } = useWallet()
  const queryClient = useQueryClient()

  const onTransactionSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['account-info'] })
  }, [queryClient])

  return useReceivePanel(
    {
      activeAddress: activeAddress ?? null,
      algodClient,
      signTransactions,
      onTransactionSuccess,
    },
    optedInAssetIds,
    registry,
  )
}
