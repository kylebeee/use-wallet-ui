import { useAssetNameSearch as useAssetNameSearchCore, type UseAssetNameSearchReturn } from '@d13co/algo-x-evm-ui'
import { type UseAssetRegistryReturn } from './useAssetRegistry'

export type { UseAssetNameSearchReturn } from '@d13co/algo-x-evm-ui'

/**
 * Convenience wrapper that accepts UseAssetRegistryReturn (which satisfies AssetSearchProvider).
 * For direct usage, import `useAssetNameSearch` from `@d13co/algo-x-evm-ui`.
 */
export function useAssetNameSearch(registry: UseAssetRegistryReturn): UseAssetNameSearchReturn {
  return useAssetNameSearchCore(registry)
}
