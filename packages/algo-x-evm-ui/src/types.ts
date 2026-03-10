/**
 * Unified transaction data type used by shared UI components.
 *
 * Both `DecodedTransaction` (bigint rawAmount) from the React package
 * and `SerializableDecodedTransaction` (string rawAmount) from the extension
 * are structurally compatible with this type.
 */
export interface TransactionData {
  index: number
  type: string
  typeLabel: string
  sender: string
  senderShort: string
  receiver?: string
  receiverShort?: string
  amount?: string
  rawAmount?: bigint | string
  assetIndex?: number
  appIndex?: number
  rekeyTo?: string
  rekeyToShort?: string
  closeRemainderTo?: string
  closeRemainderToShort?: string
  freezeTarget?: string
  freezeTargetShort?: string
  isFreezing?: boolean
}

export type TransactionDanger = 'rekey' | 'closeTo' | false

export interface AssetInfo {
  decimals: number
  name: string
  unitName: string
}

/**
 * Minimal interface for algod client asset lookup.
 * Avoids requiring algosdk as a dependency.
 */
export interface AssetLookupClient {
  getAssetByID(id: number): { do(): Promise<{ params: { decimals: number; name?: string; unitName?: string } }> }
}
