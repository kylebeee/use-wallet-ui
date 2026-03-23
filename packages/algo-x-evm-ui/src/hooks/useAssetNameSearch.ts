import { useCallback, useEffect, useRef, useState } from 'react'
import type { CachedAsset } from '../cache/assetCache'
import type { AssetSearchProvider } from '../types'

export interface UseAssetNameSearchReturn {
  nameInput: string
  setNameInput: (value: string) => void
  results: CachedAsset[]
  isSearching: boolean
  selectedAsset: CachedAsset | null
  selectAsset: (asset: CachedAsset) => void
  reset: () => void
}

export function useAssetNameSearch(provider: AssetSearchProvider): UseAssetNameSearchReturn {
  const [nameInput, setNameInputRaw] = useState('')
  const [results, setResults] = useState<CachedAsset[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<CachedAsset | null>(null)

  const setNameInput = useCallback((value: string) => {
    setNameInputRaw(value)
    setSelectedAsset(null)
  }, [])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable ref so the effect doesn't re-fire when provider object changes
  const searchByNameRef = useRef(provider.searchByName)
  searchByNameRef.current = provider.searchByName

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!nameInput.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    timerRef.current = setTimeout(async () => {
      try {
        const found = await searchByNameRef.current(nameInput.trim())
        setResults(found)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nameInput])

  const selectAsset = useCallback((asset: CachedAsset) => {
    setSelectedAsset(asset)
    setResults([])
  }, [])

  const reset = useCallback(() => {
    setNameInputRaw('')
    setResults([])
    setSelectedAsset(null)
    setIsSearching(false)
  }, [])

  return { nameInput, setNameInput, results, isSearching, selectedAsset, selectAsset, reset }
}
