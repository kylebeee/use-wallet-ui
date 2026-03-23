import { useWallet } from '@txnlab/use-wallet-react'
import { useAssetLookup as useAssetLookupCore, type UseAssetLookupReturn } from '@d13co/algo-x-evm-ui'

export type { AssetLookupInfo, UseAssetLookupReturn } from '@d13co/algo-x-evm-ui'

/**
 * Convenience wrapper that pulls algodClient from `@txnlab/use-wallet-react`.
 * For direct usage without the wallet context, import `useAssetLookup` from `@d13co/algo-x-evm-ui`.
 */
export function useAssetLookup(options: { enabled?: boolean } = {}): UseAssetLookupReturn {
  const { algodClient } = useWallet()
  return useAssetLookupCore(algodClient, options)
}
