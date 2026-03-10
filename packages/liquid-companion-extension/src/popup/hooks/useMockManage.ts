import { useState, useCallback } from 'react'
import type { SendPanelProps, ReceivePanelProps } from '@d13co/algo-x-evm-ui'

type MockSendReturn = Omit<SendPanelProps, 'onBack'>
type MockOptInReturn = Omit<ReceivePanelProps, 'onBack'>

export function useMockSend(): MockSendReturn {
  const [sendType, setSendType] = useState<'algo' | 'asa'>('algo')
  const [receiver, setReceiver] = useState('')
  const [amount, setAmount] = useState('')
  const [assetIdInput, setAssetIdInput] = useState('')
  const [status] = useState<'idle' | 'signing' | 'sending' | 'success' | 'error'>('idle')
  const [error] = useState<string | null>(null)

  const handleSend = useCallback(() => {
    alert('Send is not yet implemented in the extension')
  }, [])

  const reset = useCallback(() => {
    setSendType('algo')
    setReceiver('')
    setAmount('')
    setAssetIdInput('')
  }, [])

  const retry = useCallback(() => {
    // no-op
  }, [])

  return {
    sendType,
    setSendType,
    receiver,
    setReceiver,
    amount,
    setAmount,
    assetIdInput,
    setAssetIdInput,
    assetInfo: null,
    assetLookupLoading: false,
    assetLookupError: null,
    status,
    error,
    handleSend,
    reset,
    retry,
  }
}

export function useMockOptIn(): MockOptInReturn {
  const [assetIdInput, setAssetIdInput] = useState('')
  const [status] = useState<'idle' | 'signing' | 'sending' | 'success' | 'error'>('idle')
  const [error] = useState<string | null>(null)

  const handleOptIn = useCallback(() => {
    alert('Opt-in is not yet implemented in the extension')
  }, [])

  const reset = useCallback(() => {
    setAssetIdInput('')
  }, [])

  const retry = useCallback(() => {
    // no-op
  }, [])

  return {
    assetIdInput,
    setAssetIdInput,
    assetInfo: null,
    assetLookupLoading: false,
    assetLookupError: null,
    status,
    error,
    handleOptIn,
    reset,
    retry,
  }
}
