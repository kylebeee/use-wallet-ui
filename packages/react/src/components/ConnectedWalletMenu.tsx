import { getOpenInEntries } from '@d13co/open-in'
import { useNetwork, useWallet } from '@txnlab/use-wallet-react'
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
} from '@floating-ui/react'
import { QueryClientProvider, useIsFetching, useQueryClient } from '@tanstack/react-query'
import { ALGORAND_EVM_CHAIN_CONFIG } from 'algo-x-evm-sdk'
import React, { ReactElement, RefObject, useState } from 'react'

import { ManagePanel, useAssets, usePeraAssetData, type AssetHoldingDisplay } from '@d13co/algo-x-evm-ui'

import { useAccountInfo } from '../hooks/useAccountInfo'
import { useAssetRegistry } from '../hooks/useAssetRegistry'
import { useNfd } from '../hooks/useNfd'
import { useOptIn } from '../hooks/useOptIn'
import { useSend } from '../hooks/useSend'
import { useSwap, type UseSwapOptions } from '../hooks/useSwap'
import { useBridgeDialog } from '../providers/BridgeDialogProvider'
import { useWalletUI } from '../providers/WalletUIProvider'
import { ConnectedWalletButton } from './ConnectedWalletButton'

// A more specific type for the children that includes ref
type RefableElement = ReactElement & {
  ref?: RefObject<HTMLElement> | ((instance: HTMLElement | null) => void)
}

export interface ConnectedWalletMenuProps {
  children?: RefableElement
  /** Swap integration options. When provided, enables the Swap panel. */
  swap?: UseSwapOptions
}

function ConnectedWalletMenuContent({ children, swap: swapOptions }: ConnectedWalletMenuProps) {
  const { activeAddress, activeWallet, activeWalletAccounts, algodClient } = useWallet()
  const { theme } = useWalletUI()
  const rqClient = useQueryClient()
  const isFetching = useIsFetching()
  const [isOpen, setIsOpen] = useState(false)

  const { activeNetwork } = useNetwork()
  const registry = useAssetRegistry()
  const send = useSend()

  // Swap panel — only active when consumer provides swap options
  const defaultSwapOptions = React.useMemo((): UseSwapOptions => ({
    fetchQuote: async () => { throw new Error('Swap not configured') },
    executeSwap: async () => { throw new Error('Swap not configured') },
  }), [])
  const swapState = useSwap(swapOptions ?? defaultSwapOptions)

  const [showAvailableBalance, setShowAvailableBalance] = useState(() => {
    const stored = localStorage.getItem('uwui:balance-preference')
    return stored ? stored === 'available' : false
  })

  const dataTheme = theme === 'system' ? undefined : theme

  const nfdQuery = useNfd({ enabled: !!activeAddress })
  const nfdName = nfdQuery.data?.name ?? null

  const { data: accountInfo } = useAccountInfo({ enabled: !!activeAddress })

  const totalBalance = React.useMemo(() => {
    if (!accountInfo || accountInfo.amount === undefined) return null
    return Number(accountInfo.amount) / 1_000_000
  }, [accountInfo])

  const availableBalance = React.useMemo(() => {
    if (!accountInfo || accountInfo.amount === undefined || accountInfo.minBalance === undefined) return null
    const available = Number(accountInfo.amount) - Number(accountInfo.minBalance)
    return Math.max(0, available / 1_000_000)
  }, [accountInfo])

  const displayBalance = showAvailableBalance ? availableBalance : totalBalance

  // All opted-in asset holdings (including zero balance)
  const allHoldings = React.useMemo(() => {
    if (!accountInfo?.assets) return []
    return accountInfo.assets
  }, [accountInfo])

  const assetIds = React.useMemo(() => allHoldings.map((a) => String(a.assetId)), [allHoldings])

  const optedInAssetIds = React.useMemo(() => new Set(allHoldings.map((a) => Number(a.assetId))), [allHoldings])

  // Get EVM controller address from account metadata for Algo x EVM wallets
  const evmAddress = React.useMemo(() => {
    return (activeWallet?.activeAccount?.metadata?.evmAddress as string) ?? null
  }, [activeWallet])

  const optIn = useOptIn(registry, optedInAssetIds)
  const { bridge, openBridge } = useBridgeDialog()

  const { assets: assetInfoMap } = useAssets(assetIds, algodClient as any, activeNetwork)

  const heldAssetIds = React.useMemo(() => allHoldings.map((a) => Number(a.assetId)), [allHoldings])
  const { peraData, fetchFor: fetchPeraFor } = usePeraAssetData(heldAssetIds, activeNetwork)

  const assetHoldings = React.useMemo((): AssetHoldingDisplay[] => {
    return allHoldings
      .map((holding) => {
        const info = assetInfoMap[String(holding.assetId)]
        if (!info) return null
        const raw = BigInt(holding.amount)
        let amount: string
        if (info.decimals === 0) {
          amount = raw.toString()
        } else {
          const divisor = 10n ** BigInt(info.decimals)
          const whole = raw / divisor
          const remainder = raw % divisor
          if (remainder === 0n) {
            amount = whole.toString()
          } else {
            const frac = remainder.toString().padStart(info.decimals, '0').replace(/0+$/, '')
            amount = `${whole}.${frac}`
          }
        }
        const pera = peraData.get(Number(holding.assetId))
        const entry: AssetHoldingDisplay = {
          assetId: Number(holding.assetId),
          name: info.name || `ASA#${holding.assetId}`,
          unitName: info.unitName,
          amount,
          decimals: info.decimals,
          logo: pera?.logo,
          verificationTier: pera?.verificationTier,
        }
        return entry
      })
      .filter((a): a is AssetHoldingDisplay => a !== null)
  }, [allHoldings, assetInfoMap, peraData])

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open)
      if (!open) {
        optIn.reset()
        send.reset()
        swapState.reset()
      }
    },
    placement: 'bottom-end',
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  })

  const txInProgress =
    send.status === 'signing' ||
    send.status === 'sending' ||
    swapState.status === 'signing' ||
    swapState.status === 'sending' ||
    optIn.status === 'signing' ||
    optIn.status === 'sending' ||
    bridge.status === 'permit-signing' ||
    bridge.status === 'approving' ||
    bridge.status === 'bundling' ||
    bridge.status === 'signing' ||
    bridge.status === 'sending' ||
    bridge.status === 'opting-in' ||
    bridge.status === 'waiting' ||
    bridge.status === 'watching-funding' ||
    bridge.status === 'opt-in-sent'

  const click = useClick(context)
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown', enabled: !txInProgress })
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  const labelId = useId()

  const handleDisconnect = React.useCallback(async () => {
    if (activeWallet) {
      try {
        await activeWallet.disconnect()
        setIsOpen(false)
      } catch (error) {
        console.error('Error disconnecting wallet:', error)
      }
    }
  }, [activeWallet])

  const toggleBalanceView = () => {
    const newValue = !showAvailableBalance
    setShowAvailableBalance(newValue)
    localStorage.setItem('uwui:balance-preference', newValue ? 'available' : 'total')
  }

  const getTxExplorerUrl = React.useCallback(
    (txId: string | null) => {
      if (!txId || !activeNetwork) return null
      const entries = getOpenInEntries(activeNetwork as any, 'transaction')
      const first = entries[0]
      if (!first) return null
      return first.getUrl(activeNetwork as any, 'transaction', txId)
    },
    [activeNetwork],
  )

  const handleExplore = React.useMemo(() => {
    if (!activeAddress || !activeNetwork) return undefined
    const entries = getOpenInEntries(activeNetwork as any, 'account')
    const first = entries[0]
    if (!first) return undefined
    const url = first.getUrl(activeNetwork as any, 'account', activeAddress)
    if (!url) return undefined
    return () => window.open(url, '_blank', 'noopener,noreferrer')
  }, [activeAddress, activeNetwork])

  const evmWalletName = (activeWallet?.activeAccount?.metadata?.connectorName as string) || 'MetaMask'
  const evmWalletIcon = (activeWallet?.activeAccount?.metadata?.connectorIcon as string) || activeWallet?.metadata.icon || ''

  const handleAddNetwork = React.useCallback(async () => {
    const getEvmProvider = (activeWallet as unknown as Record<string, unknown>)?.getEvmProvider as
      | (() => Promise<{ request(args: { method: string; params?: unknown[] }): Promise<unknown> }>)
      | undefined
    if (!getEvmProvider) return
    try {
      const provider = await getEvmProvider()
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [ALGORAND_EVM_CHAIN_CONFIG],
      })
    } catch (err) {
      console.error('[ConnectedWalletMenu] Failed to add Algorand network:', err)
    }
  }, [activeWallet])

  const handleAddAsset = React.useCallback(async (asset: AssetHoldingDisplay) => {
    const getEvmProvider = (activeWallet as unknown as Record<string, unknown>)?.getEvmProvider as
      | (() => Promise<{ request(args: { method: string; params?: unknown[] }): Promise<unknown> }>)
      | undefined
    if (!getEvmProvider) return
    try {
      const provider = await getEvmProvider()
      // Convert asset ID to pseudo contract address: decimal digits left-padded to 40 chars
      const address = '0x' + String(asset.assetId).padStart(40, '0')
      await provider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address,
            symbol: asset.unitName || asset.name.slice(0, 11),
            decimals: asset.decimals,
          },
        } as unknown as unknown[],
      })
    } catch (err) {
      console.error('[ConnectedWalletMenu] Failed to add asset to wallet:', err)
    }
  }, [activeWallet])

  const triggerElement = children || <ConnectedWalletButton />
  const trigger = React.cloneElement(triggerElement, getReferenceProps({ ref: refs.setReference }))

  return (
    <>
      {trigger}
      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div data-wallet-theme data-wallet-ui data-theme={dataTheme}>
              <div
                ref={refs.setFloating}
                style={{ ...floatingStyles, width: 'min(420px, 95vw)' }}
                {...getFloatingProps()}
                role="menu"
                aria-labelledby={labelId}
                className="z-50 rounded-xl bg-[var(--wui-color-bg)] shadow-xl border border-[var(--wui-color-border)]"
              >
                <div className="p-4">
                  <ManagePanel
                    displayBalance={displayBalance}
                    showAvailableBalance={showAvailableBalance}
                    onToggleBalance={toggleBalanceView}
                    send={{ ...send, explorerUrl: getTxExplorerUrl(send.txId) }}
                    optIn={{ ...optIn, evmAddress, explorerUrl: getTxExplorerUrl(optIn.txId), peraData, fetchPeraData: fetchPeraFor }}
                    swap={swapOptions ? { ...swapState, accountAssets: assetHoldings.length > 0 ? assetHoldings : undefined, totalBalance, availableBalance, explorerUrl: getTxExplorerUrl(swapState.txId), peraData, fetchPeraData: fetchPeraFor } : undefined}
                    onBridgeClick={bridge.isAvailable ? openBridge : undefined}
                    assets={assetHoldings.length > 0 ? assetHoldings : undefined}
                    totalBalance={totalBalance}
                    availableBalance={availableBalance}
                    onRefresh={() => rqClient.invalidateQueries()}
                    isRefreshing={isFetching > 0}
                    onExplore={handleExplore}
                    activeAddress={activeAddress}
                    displayName={nfdName}
                    evmAddress={evmAddress}
                    walletName={evmWalletName}
                    walletIcon={evmWalletIcon}
                    onDisconnect={handleDisconnect}
                    accounts={activeWalletAccounts?.map((a) => ({
                      address: a.address,
                      displayName: a.name !== a.address ? a.name : null,
                      icon: null,
                    }))}
                    onAccountSwitch={activeWallet ? (addr: string) => activeWallet.setActiveAccount(addr) : undefined}
                    addToWallet={{
                      walletName: evmWalletName,
                      walletIcon: evmWalletIcon,
                      assets: assetHoldings.length > 0 ? assetHoldings : undefined,
                      onAddNetwork: handleAddNetwork,
                      onAddAsset: handleAddAsset,
                    }}
                  />
                </div>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}

// Need to provide the QueryClientProvider here because FloatingPortal breaks context inheritance
export function ConnectedWalletMenu(props: ConnectedWalletMenuProps) {
  const { queryClient } = useWalletUI()

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectedWalletMenuContent {...props} />
    </QueryClientProvider>
  )
}
