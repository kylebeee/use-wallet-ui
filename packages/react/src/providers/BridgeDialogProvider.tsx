import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useBridge, BRIDGE_PERSIST_KEY, type UseBridgeReturn } from '../hooks/useBridge'

export interface BridgeDialogContextType {
  bridge: UseBridgeReturn
  isOpen: boolean
  isMinimized: boolean
  openBridge: () => void
  closeBridge: () => void
  minimizeBridge: () => void
  restoreBridge: () => void
  enableBridge: () => void
}

const BridgeDialogContext = createContext<BridgeDialogContextType | undefined>(undefined)

// Statuses that indicate bridge is actively processing
const PROCESSING_STATUSES = new Set([
  'approving',
  'bundling',
  'signing',
  'sending',
  'opting-in',
  'waiting',
  'watching-funding',
  'opt-in-sent',
])

export function BridgeDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(() => {
    try { return localStorage.getItem(BRIDGE_PERSIST_KEY) !== null } catch { return false }
  })
  const [isMinimized, setIsMinimized] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const bridge = useBridge({ enabled: isOpen || isEnabled })
  const prevStatusRef = useRef(bridge.status)

  const isProcessing = PROCESSING_STATUSES.has(bridge.status)

  const openBridge = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const closeBridge = useCallback(() => {
    if (isProcessing) return
    setIsOpen(false)
    setIsMinimized(false)
    setIsEnabled(false)
    bridge.reset()
  }, [isProcessing, bridge])

  const minimizeBridge = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const restoreBridge = useCallback(() => {
    setIsMinimized(false)
  }, [])

  const enableBridge = useCallback(() => {
    setIsEnabled(true)
  }, [])

  // Auto-close if wallet disconnects (bridge becomes unavailable).
  // Skip if persisted bridge state exists — wallet may still be reconnecting after reload.
  useEffect(() => {
    if (!bridge.isAvailable && isOpen) {
      try {
        if (localStorage.getItem(BRIDGE_PERSIST_KEY)) return
      } catch {}
      setIsOpen(false)
      setIsMinimized(false)
    }
  }, [bridge.isAvailable, isOpen])

  // Auto-maximize when bridge completes
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = bridge.status

    if (bridge.status === 'success' && prev !== 'success') {
      setIsOpen(true)
      setIsMinimized(false)
    }
  }, [bridge.status])

  const value = useMemo<BridgeDialogContextType>(
    () => ({
      bridge,
      isOpen,
      isMinimized,
      openBridge,
      closeBridge,
      minimizeBridge,
      restoreBridge,
      enableBridge,
    }),
    [bridge, isOpen, isMinimized, openBridge, closeBridge, minimizeBridge, restoreBridge, enableBridge],
  )

  return <BridgeDialogContext.Provider value={value}>{children}</BridgeDialogContext.Provider>
}

export function useBridgeDialog(): BridgeDialogContextType {
  const context = useContext(BridgeDialogContext)
  if (context === undefined) {
    throw new Error('useBridgeDialog must be used within a BridgeDialogProvider')
  }
  return context
}
