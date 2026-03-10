import type { TransactionDanger } from '@d13co/algo-x-evm-ui'

// Message type prefix
export const MSG_PREFIX = 'LIQUID_WALLET_COMP_EXT_' as const

// Message types
export const MessageType = {
  PING: `${MSG_PREFIX}PING`,
  PONG: `${MSG_PREFIX}PONG`,
  ANNOUNCE: `${MSG_PREFIX}ANNOUNCE`,
  SIGN_REQUEST: `${MSG_PREFIX}SIGN_REQUEST`,
  SIGN_RESPONSE: `${MSG_PREFIX}SIGN_RESPONSE`,
  SIGN_COMPLETE: `${MSG_PREFIX}SIGN_COMPLETE`,
} as const

// Source identifiers
export const MessageSource = {
  PAGE: 'use-wallet-ui',
  CONTENT: 'liquid-wallet-companion-content',
  POPUP: 'liquid-wallet-companion-popup',
  BACKGROUND: 'liquid-wallet-companion-background',
} as const

export type { TransactionDanger }

// Serializable version of TransactionData (rawAmount as string for postMessage)
export interface SerializableDecodedTransaction {
  index: number
  type: string
  typeLabel: string
  sender: string
  senderShort: string
  receiver?: string
  receiverShort?: string
  amount?: string
  rawAmount?: string // bigint serialized as string
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

// --- Message payloads ---

export interface PingMessage {
  type: typeof MessageType.PING
  source: typeof MessageSource.PAGE
}

export interface PongMessage {
  type: typeof MessageType.PONG
  source: typeof MessageSource.CONTENT
}

export interface AnnounceMessage {
  type: typeof MessageType.ANNOUNCE
  source: typeof MessageSource.CONTENT
}

export interface SignRequestMessage {
  type: typeof MessageType.SIGN_REQUEST
  source: typeof MessageSource.PAGE
  requestId: string
  transactions: SerializableDecodedTransaction[]
  message: string
  dangerous: TransactionDanger
  walletName?: string
  algodConfig?: { baseServer: string; token: string; port?: string | number }
  rawTransactions?: string[] // base64-encoded unsigned transaction bytes
}

export interface SignResponseMessage {
  type: typeof MessageType.SIGN_RESPONSE
  source: typeof MessageSource.POPUP
  requestId: string
  approved: boolean
}

export interface SignCompleteMessage {
  type: typeof MessageType.SIGN_COMPLETE
  source: typeof MessageSource.PAGE
  requestId: string
}

export type PageMessage = PingMessage | SignRequestMessage | SignCompleteMessage
export type ContentToPageMessage = PongMessage | AnnounceMessage
export type ExtensionMessage = SignRequestMessage | SignResponseMessage | SignCompleteMessage

// Storage key for pending sign request
export const STORAGE_KEY_PENDING_REQUEST = 'pendingSignRequest'

export interface StoredSignRequest {
  requestId: string
  transactions: SerializableDecodedTransaction[]
  message: string
  dangerous: TransactionDanger
  walletName?: string
  algodConfig?: { baseServer: string; token: string; port?: string | number }
  rawTransactions?: string[] // base64-encoded unsigned transaction bytes
  tabId: number
  origin: string
}
