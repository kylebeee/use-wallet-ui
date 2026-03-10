import { useEffect, useMemo, useState } from 'react'
import algosdk from 'algosdk'
import { ManagePanel } from '@d13co/algo-x-evm-ui'
import { useMockSend, useMockOptIn } from './hooks/useMockManage'
import {
  MessageType,
  MessageSource,
  STORAGE_KEY_PENDING_REQUEST,
} from '../types/messages'
import type { StoredSignRequest, SignRequestMessage, SignCompleteMessage } from '../types/messages'
import { TransactionView } from './components/TransactionView'
import { verifyPayload } from './utils/verifyPayload'

export function App() {
  const [request, setRequest] = useState<StoredSignRequest | null>(null)
  const [signing, setSigning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'idle' | 'manage' | 'transaction'>('idle')
  const [showAvailable, setShowAvailable] = useState(false)

  const mockSend = useMockSend()
  const mockOptIn = useMockOptIn()

  // Load pending request from session storage on mount
  useEffect(() => {
    chrome.storage.session.get(STORAGE_KEY_PENDING_REQUEST, (result) => {
      const stored = result[STORAGE_KEY_PENDING_REQUEST] as StoredSignRequest | undefined
      if (stored) {
        setRequest(stored)
      }
      setLoading(false)
    })
  }, [])

  // Listen for new requests or completion from background
  useEffect(() => {
    const listener = (message: SignRequestMessage | SignCompleteMessage) => {
      if (
        message.type === MessageType.SIGN_REQUEST &&
        message.source === MessageSource.PAGE
      ) {
        setRequest({
          requestId: message.requestId,
          transactions: message.transactions,
          message: message.message,
          dangerous: message.dangerous,
          walletName: message.walletName,
          algodConfig: message.algodConfig,
          rawTransactions: message.rawTransactions,
          tabId: 0,
          origin: '',
        })
        setSigning(false)
      }

      if (
        message.type === MessageType.SIGN_COMPLETE &&
        message.source === MessageSource.PAGE
      ) {
        setRequest(null)
        setSigning(false)
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // Create algod client from config
  const algodClient = useMemo(() => {
    if (!request?.algodConfig) return undefined
    const { baseServer, token, port } = request.algodConfig
    return new algosdk.Algodv2(token, baseServer, port)
  }, [request?.algodConfig])

  // Verify payload against raw transactions
  const payloadVerification = useMemo(() => {
    if (!request?.rawTransactions) return { verified: null as boolean | null, message: request?.message ?? '' }
    const result = verifyPayload(request.rawTransactions, request.message)
    if (result.valid) {
      return { verified: true, message: request.message }
    }
    // Invalid: use corrected message if available
    return { verified: false, message: result.correctMessage ?? request.message }
  }, [request?.rawTransactions, request?.message])

  const handleApprove = () => {
    if (!request) return
    chrome.runtime.sendMessage({
      type: MessageType.SIGN_RESPONSE,
      source: MessageSource.POPUP,
      requestId: request.requestId,
      approved: true,
    })
    setSigning(true)
  }

  const handleReject = () => {
    if (!request) return
    chrome.runtime.sendMessage({
      type: MessageType.SIGN_RESPONSE,
      source: MessageSource.POPUP,
      requestId: request.requestId,
      approved: false,
    })
    setRequest(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--wui-color-text-secondary)]">
        Loading...
      </div>
    )
  }

  if (!request) {
    return (
      <div className="overflow-hidden border border-[var(--wui-color-border)]">
        <div
          className="flex transition-transform duration-200 ease-in-out"
          style={{ transform: view === 'manage' ? 'translateX(-100%)' : 'translateX(0)' }}
        >
          {/* Idle panel */}
          <div className="flex flex-col items-center justify-center h-48 gap-2 px-4 text-center min-w-full">
            <div className="text-lg font-bold text-[var(--wui-color-text)]">
              Liquid Wallet Companion
            </div>
            <div className="text-sm text-[var(--wui-color-text-secondary)]">
              No pending transaction to review.
            </div>
            <div className="text-xs text-[var(--wui-color-text-tertiary)]">
              Transaction requests will appear here when a dApp asks you to sign.
            </div>
            <button
              onClick={() => setView('manage')}
              className="mt-2 py-2 px-4 bg-[var(--wui-color-bg-tertiary)] text-[var(--wui-color-text-secondary)] font-medium rounded-xl hover:brightness-90 transition-all text-sm flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
              Manage
            </button>
          </div>

          {/* Manage panel */}
          <div className="p-4 min-w-full">
            <ManagePanel
              displayBalance={showAvailable ? 42.1234 : 123.4567}
              showAvailableBalance={showAvailable}
              onToggleBalance={() => setShowAvailable((v) => !v)}
              onBack={() => setView('idle')}
              send={mockSend}
              optIn={mockOptIn}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <TransactionView
      transactions={request.transactions}
      message={payloadVerification.message}
      dangerous={request.dangerous}
      origin={request.origin}
      walletName={request.walletName}
      signing={signing}
      algodClient={algodClient}
      payloadVerified={payloadVerification.verified}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  )
}
