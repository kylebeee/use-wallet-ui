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
  // Common fields
  fee?: number | string
  firstValid?: number | string
  lastValid?: number | string
  genesisID?: string
  genesisHash?: string
  group?: string
  lease?: string
  note?: string
  // App call fields
  onComplete?: string
  appArgs?: string[]
  appAccounts?: string[]
  appForeignApps?: string[]
  appForeignAssets?: string[]
  approvalProgram?: string
  clearProgram?: string
  // Key registration fields
  voteKey?: string
  selectionKey?: string
  stateProofKey?: string
  voteFirst?: number | string
  voteLast?: number | string
  voteKeyDilution?: number | string
  nonParticipation?: boolean
  // Asset config fields
  assetTotal?: string
  assetDecimals?: number
  assetDefaultFrozen?: boolean
  assetManager?: string
  assetReserve?: string
  assetFreeze?: string
  assetClawback?: string
  assetUnitName?: string
  assetName?: string
  assetURL?: string
  // Asset transfer fields
  assetSender?: string
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
