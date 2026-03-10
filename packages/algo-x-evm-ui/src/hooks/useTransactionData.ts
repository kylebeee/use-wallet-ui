import { useMemo } from 'react'
import { useAssets } from './useAssets'
import type { TransactionData, AssetInfo, AssetLookupClient } from '../types'

export function useTransactionData(
  transactions: TransactionData[],
  options?: {
    algodClient?: AssetLookupClient
    getApplicationAddress?: (appId: number) => { toString(): string }
    network?: string
  },
): { loading: boolean; assets: Record<string, AssetInfo>; appEscrows: Record<string, string> } {
  const algodClient = options?.algodClient
  const getApplicationAddress = options?.getApplicationAddress

  const assetIds = useMemo(() => {
    const ids = new Set<string>()
    for (const txn of transactions) {
      if (txn.assetIndex) {
        ids.add(txn.assetIndex.toString())
      }
    }
    return Array.from(ids)
  }, [transactions])

  const { loading, assets } = useAssets(assetIds, algodClient, options?.network)

  const appEscrows = useMemo(() => {
    if (!getApplicationAddress) return {}
    const escrows: Record<string, string> = {}
    for (const txn of transactions) {
      if (txn.type === 'appl' && txn.appIndex) {
        const escrowAddr = getApplicationAddress(txn.appIndex)
        escrows[escrowAddr.toString()] = `App ${txn.appIndex}`
      }
    }
    return escrows
  }, [transactions, getApplicationAddress])

  return { loading, assets, appEscrows }
}
