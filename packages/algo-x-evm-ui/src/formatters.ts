import type { TransactionData, AssetInfo } from './types'

export function formatAssetAmount(rawAmount: bigint | string | undefined, info: AssetInfo): string {
  if (rawAmount === undefined) return `0 ${info.unitName}`
  const amount = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount)
  if (info.decimals === 0) return `${amount} ${info.unitName}`
  const divisor = 10n ** BigInt(info.decimals)
  const whole = amount / divisor
  const remainder = amount % divisor
  if (remainder === 0n) return `${whole} ${info.unitName}`
  const frac = remainder.toString().padStart(info.decimals, '0').replace(/0+$/, '')
  return `${whole}.${frac} ${info.unitName}`
}

export function assetLabel(txn: TransactionData, info?: AssetInfo): string {
  if (info?.unitName) return info.unitName
  if (!txn.assetIndex) return 'ASA'
  return `ASA#${txn.assetIndex}`
}
