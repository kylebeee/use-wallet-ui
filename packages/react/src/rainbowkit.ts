import { getDefaultConfig as rkGetDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  safeWallet,
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import {
  RainbowKitBridge,
  createRainbowKitBridgeState,
  createGetEvmAccounts,
  type RainbowKitBridgeState,
  type RainbowKitBridgeProps,
  type WalletManagerLike,
  type WagmiConfig,
} from './components/RainbowKitBridge'
import { createBoundProvider } from './components/RainbowKitAutoProvider'
import type { RainbowKitUIConfig } from './providers/WalletUIProvider'

const DEFAULT_WALLETS = [
  {
    groupName: 'Popular',
    wallets: [safeWallet, rainbowWallet, metaMaskWallet, walletConnectWallet],
  },
]

/**
 * Clear stale WalletConnect v2 pairing data from localStorage.
 *
 * WC2 distinguishes between *pairings* (ephemeral, used only during the
 * session negotiation handshake) and *sessions* (persistent, used to
 * reconnect on page reload). Stale pairings left over from previous
 * connection attempts cause "No matching key / session topic doesn't exist"
 * relay errors on mobile wallets, which prevent the `session_settle` event
 * from being delivered and leave the frontend stuck after the user accepts
 * the connection on their phone.
 *
 * Clearing pairings at startup is safe: active sessions are stored under
 * separate keys and are not affected, so wallet reconnection on page reload
 * continues to work normally.
 */
function clearStaleWcPairings(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      // Match any WC2 key that belongs to the pairing or request subsystem.
      // Session keys (wc@2:client:*:session) are intentionally left intact.
      if (/^wc@2:/.test(key) && /(pairing|request|message)/.test(key)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // localStorage may be unavailable (SSR, private browsing restrictions)
  }
}

/**
 * Like RainbowKit's `getDefaultConfig`, but excludes the Base Account wallet
 * from the default wallet list. Pass an explicit `wallets` array to override.
 *
 * Import from `@txnlab/use-wallet-ui-react/rainbowkit` instead of
 * `@rainbow-me/rainbowkit` — all other options are identical.
 *
 * Also clears stale WalletConnect v2 pairing data to prevent mobile wallet
 * connection issues ("No matching key" relay errors).
 */
export const getDefaultConfig: typeof rkGetDefaultConfig = (params) => {
  clearStaleWcPairings()
  const appUrl = (params as { appUrl?: string }).appUrl ?? (typeof window !== 'undefined' ? window.location.origin : undefined)
  return rkGetDefaultConfig({ wallets: DEFAULT_WALLETS, ...params, ...(appUrl ? { appUrl } : {}) })
}

// Backward-compatible exports
export {
  RainbowKitBridge,
  createRainbowKitBridgeState,
  createGetEvmAccounts,
}

export type {
  RainbowKitBridgeState,
  RainbowKitBridgeProps,
  WalletManagerLike,
}

export type { RainbowKitUIConfig }

/**
 * Create a RainbowKit configuration for WalletUIProvider.
 *
 * Call once at module level (or in a useMemo) and pass the result to
 * `<WalletUIProvider rainbowkit={...}>`. The provider handles all
 * WagmiProvider/RainbowKitProvider/bridge wiring internally.
 */
export function createRainbowKitConfig(options: { wagmiConfig: WagmiConfig }): RainbowKitUIConfig {
  const bridgeState = createRainbowKitBridgeState()
  const getEvmAccounts = createGetEvmAccounts(options.wagmiConfig, bridgeState)
  const Provider = createBoundProvider(options.wagmiConfig, bridgeState)

  return { Provider, getEvmAccounts }
}
