import { type CachedAsset } from '@d13co/algo-x-evm-ui'
import { useCallback, useEffect, useRef, useState } from 'react'

import { type UseAssetRegistryReturn } from './useAssetRegistry'

export interface UseAssetNameSearchReturn {
  nameInput: string
  setNameInput: (value: string) => void
  results: CachedAsset[]
  isSearching: boolean
  selectedAsset: CachedAsset | null
  selectAsset: (asset: CachedAsset) => void
  reset: () => void
}

export function useAssetNameSearch(registry: UseAssetRegistryReturn): UseAssetNameSearchReturn {
  const [nameInput, setNameInputRaw] = useState('')
  const [results, setResults] = useState<CachedAsset[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<CachedAsset | null>(null)

  const setNameInput = useCallback((value: string) => {
    setNameInputRaw(value)
    setSelectedAsset(null)
  }, [])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable ref so the effect doesn't re-fire when registry object changes
  const searchByNameRef = useRef(registry.searchByName)
  searchByNameRef.current = registry.searchByName

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!nameInput.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    console.log('[useAssetNameSearch] effect fired, nameInput:', nameInput)

    timerRef.current = setTimeout(async () => {
      try {
        console.log('[useAssetNameSearch] searching for:', nameInput.trim())
        const found = await searchByNameRef.current(nameInput.trim())
        console.log('[useAssetNameSearch] results:', found.length, found.slice(0, 3))
        setResults(found)
      } catch (err) {
        console.error('[useAssetNameSearch] search error:', err)
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
