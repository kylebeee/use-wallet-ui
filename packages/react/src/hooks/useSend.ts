import { useWallet } from '@txnlab/use-wallet-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSendPanel, type UseSendPanelReturn } from '@d13co/algo-x-evm-ui'
import { useCallback } from 'react'

export type { UseSendPanelReturn as UseSendReturn } from '@d13co/algo-x-evm-ui'

/**
 * Convenience wrapper around `useSendPanel` that pulls wallet context
 * from `@txnlab/use-wallet-react` and invalidates React Query on success.
 */
export function useSend(): UseSendPanelReturn {
  const { activeAddress, algodClient, signTransactions } = useWallet()
  const queryClient = useQueryClient()

  const onTransactionSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['account-info'] })
  }, [queryClient])

  return useSendPanel({
    activeAddress: activeAddress ?? null,
    algodClient,
    signTransactions,
    onTransactionSuccess,
  })
}
