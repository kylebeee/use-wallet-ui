import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { AssetInfo, AssetLookupClient } from '../types'

export function useAssets(
  assetIds: string[],
  algodClient: AssetLookupClient | undefined,
  network?: string,
): {
  loading: boolean
  assets: Record<string, AssetInfo>
} {
  const results = useQueries({
    queries: assetIds.map((id) => ({
      queryKey: ['asset', id, network],
      queryFn: async (): Promise<AssetInfo> => {
        const result = await algodClient!.getAssetByID(Number(id)).do()
        return {
          decimals: result.params.decimals,
          name: result.params.name || '',
          unitName: result.params.unitName || '',
        }
      },
      retries: 0,
      enabled: !!algodClient,
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  })

  const loading = results.some((r) => r.isLoading)

  const assets = useMemo(() => {
    const map: Record<string, AssetInfo> = {}
    for (let i = 0; i < assetIds.length; i++) {
      const data = results[i]?.data
      if (data) {
        map[assetIds[i]] = data
      }
    }
    return map
  }, [assetIds, results])

  return { loading, assets }
}
