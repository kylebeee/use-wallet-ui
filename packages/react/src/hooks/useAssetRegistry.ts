import { useNetwork, useWallet } from '@txnlab/use-wallet-react'
import { useAssetRegistry as useAssetRegistryCore, type UseAssetRegistryReturn } from '@d13co/algo-x-evm-ui'

export type { UseAssetRegistryReturn } from '@d13co/algo-x-evm-ui'

/**
 * Convenience wrapper that pulls algodClient and activeNetwork from `@txnlab/use-wallet-react`.
 * For direct usage without the wallet context, import `useAssetRegistry` from `@d13co/algo-x-evm-ui`.
 */
export function useAssetRegistry(): UseAssetRegistryReturn {
  const { algodClient } = useWallet()
  const { activeNetwork } = useNetwork()
  return useAssetRegistryCore(algodClient, activeNetwork)
}
