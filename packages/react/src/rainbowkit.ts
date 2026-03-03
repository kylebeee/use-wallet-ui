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
 * Like RainbowKit's `getDefaultConfig`, but excludes the Base Account wallet
 * from the default wallet list. Pass an explicit `wallets` array to override.
 *
 * Import from `@txnlab/use-wallet-ui-react/rainbowkit` instead of
 * `@rainbow-me/rainbowkit` — all other options are identical.
 */
export const getDefaultConfig: typeof rkGetDefaultConfig = (params) =>
  rkGetDefaultConfig({ wallets: DEFAULT_WALLETS, ...params })

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
