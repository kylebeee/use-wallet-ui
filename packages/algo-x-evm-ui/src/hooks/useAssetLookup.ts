import type algosdk from 'algosdk'
import { useCallback, useEffect, useState } from 'react'
import { AssetCache } from '../cache/assetCache'

export interface AssetLookupInfo {
  index: number
  name: string
  unitName: string
  decimals: number
}

export interface UseAssetLookupReturn {
  assetIdInput: string
  setAssetIdInput: (value: string) => void
  assetInfo: AssetLookupInfo | null
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useAssetLookup(
  algodClient: algosdk.Algodv2 | null | undefined,
  options: { enabled?: boolean } = {},
): UseAssetLookupReturn {
  const { enabled = true } = options

  const [assetIdInput, setAssetIdInput] = useState('')
  const [assetInfo, setAssetInfo] = useState<AssetLookupInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setAssetIdInput('')
    setAssetInfo(null)
    setIsLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    setAssetInfo(null)
    setError(null)

    const assetId = parseInt(assetIdInput, 10)
    if (!assetIdInput || isNaN(assetId) || assetId <= 0 || !algodClient || !enabled) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        // Try the local registry cache first (instant, no network call)
        const cached = await AssetCache.getById(assetId)
        if (cached) {
          setAssetInfo({
            index: cached.index,
            name: cached.name || 'Unnamed Asset',
            unitName: cached.unitName || '',
            decimals: cached.decimals,
          })
          setIsLoading(false)
          return
        }

        // Fall back to algod
        const result = await algodClient.getAssetByID(assetId).do()
        setAssetInfo({
          index: Number(result.index),
          name: result.params.name || 'Unnamed Asset',
          unitName: result.params.unitName || '',
          decimals: result.params.decimals,
        })
      } catch {
        setError('Asset not found')
      } finally {
        setIsLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [assetIdInput, algodClient, enabled])

  return { assetIdInput, setAssetIdInput, assetInfo, isLoading, error, reset }
}
