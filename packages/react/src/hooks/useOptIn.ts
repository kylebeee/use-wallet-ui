import type { CachedAsset } from '@d13co/algo-x-evm-ui'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQueryClient } from '@tanstack/react-query'
import algosdk from 'algosdk'
import { useCallback, useState } from 'react'

import { useAssetLookup } from './useAssetLookup'
import { useAssetNameSearch } from './useAssetNameSearch'
import { type UseAssetRegistryReturn } from './useAssetRegistry'

export interface UseOptInReturn {
  activeAddress: string | null
  optedInAssetIds: Set<number>
  assetIdInput: string
  setAssetIdInput: (value: string) => void
  assetInfo: { name: string; unitName: string; index: number; decimals: number } | null
  assetLookupLoading: boolean
  assetLookupError: string | null
  txId: string | null
  status: 'idle' | 'signing' | 'sending' | 'success' | 'error'
  error: string | null
  handleOptIn: () => Promise<void>
  reset: () => void
  retry: () => void
  // Name search fields for ReceivePanel
  nameSearchResults: CachedAsset[]
  nameSearchLoading: boolean
  registryLoading: boolean
  selectedNameAsset: CachedAsset | null
  onSelectNameAsset: (asset: CachedAsset) => void
  isNameMode: boolean
}

function isNumericInput(input: string): boolean {
  return /^\d*$/.test(input)
}

export function useOptIn(registry: UseAssetRegistryReturn, optedInAssetIds: Set<number> = new Set()): UseOptInReturn {
  const { activeAddress, algodClient, signTransactions } = useWallet()
  const queryClient = useQueryClient()
  const lookup = useAssetLookup()
  const nameSearch = useAssetNameSearch(registry)

  const [status, setStatus] = useState<'idle' | 'signing' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)

  // Track which mode we're in based on the current input
  const [rawInput, setRawInput] = useState('')
  const isNameMode = !isNumericInput(rawInput)

  const reset = useCallback(() => {
    setRawInput('')
    lookup.reset()
    nameSearch.reset()
    setTxId(null)
    setStatus('idle')
    setError(null)
  }, [lookup, nameSearch])

  const retry = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const setAssetIdInput = useCallback(
    (value: string) => {
      const numeric = isNumericInput(value)
      console.log('[useOptIn] setAssetIdInput:', { value, isNumeric: numeric })
      setRawInput(value)
      if (numeric) {
        lookup.setAssetIdInput(value)
        nameSearch.reset()
      } else {
        lookup.setAssetIdInput('')
        nameSearch.setNameInput(value)
      }
    },
    [lookup, nameSearch],
  )

  const handleOptIn = useCallback(async () => {
    const currentIsNameMode = !isNumericInput(rawInput)
    const assetIndex = currentIsNameMode ? nameSearch.selectedAsset?.index : lookup.assetInfo?.index
    if (!assetIndex || !activeAddress || !algodClient) return

    setStatus('signing')
    setError(null)
    setTxId(null)

    try {
      const suggestedParams = await algodClient.getTransactionParams().do()
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: activeAddress,
        amount: 0,
        assetIndex: assetIndex,
        suggestedParams,
      })

      const signedTxns = await signTransactions([txn.toByte()])
      const signedTxn = signedTxns[0]
      if (!signedTxn) throw new Error('Transaction was not signed')

      setStatus('sending')
      const id = txn.txID()
      await algodClient.sendRawTransaction(signedTxn).do()
      await algosdk.waitForConfirmation(algodClient, id, 4)

      queryClient.invalidateQueries({ queryKey: ['account-info'] })

      setTxId(id)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Opt-in failed')
    }
  }, [rawInput, nameSearch.selectedAsset, lookup.assetInfo, activeAddress, algodClient, signTransactions, queryClient])

  return {
    activeAddress: activeAddress ?? null,
    optedInAssetIds,
    assetIdInput: rawInput,
    setAssetIdInput,
    assetInfo: lookup.assetInfo,
    assetLookupLoading: lookup.isLoading,
    assetLookupError: lookup.error,
    txId,
    status,
    error,
    handleOptIn,
    reset,
    retry,
    nameSearchResults: nameSearch.results,
    nameSearchLoading: nameSearch.isSearching,
    registryLoading: registry.registryLoading,
    selectedNameAsset: nameSearch.selectedAsset,
    onSelectNameAsset: nameSearch.selectAsset,
    isNameMode,
  }
}
