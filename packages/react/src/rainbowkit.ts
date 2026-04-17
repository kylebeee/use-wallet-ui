import { getDefaultConfig as rkGetDefaultConfig } from '@rainbow-me/rainbowkit'
import { http, type Transport } from 'viem'
import {
  mainnet,
  base,
  bsc,
  polygon,
  arbitrum,
  avalanche,
  optimism,
  celo,
  sonic,
  unichain,
  linea,
} from 'wagmi/chains'

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
import { DEFAULT_RPC_URLS } from './services/bridgeSdk'

/**
 * EVM chains supported by the Allbridge bridge integration.
 * Registered in the wagmi config so that wallet operations (signTypedData,
 * getConnectorClient, etc.) work when MetaMask is on any of these networks.
 */
const BRIDGE_CHAINS = [mainnet, base, bsc, polygon, arbitrum, avalanche, optimism, celo, sonic, unichain, linea]

/**
 * Default wagmi/viem transports for the bridge chains, pointing at the same
 * DRPC endpoints used by the Allbridge SDK. Without these, viem falls back to
 * each chain's `rpcUrls.default.http[0]` (e.g. `eth.merkle.io` for mainnet).
 * Callers can override per-chain via `params.transports`.
 */
const BRIDGE_TRANSPORTS: Record<number, Transport> = {
  [mainnet.id]: http(DEFAULT_RPC_URLS.ETH),
  [base.id]: http(DEFAULT_RPC_URLS.BAS),
  [bsc.id]: http(DEFAULT_RPC_URLS.BSC),
  [polygon.id]: http(DEFAULT_RPC_URLS.POL),
  [arbitrum.id]: http(DEFAULT_RPC_URLS.ARB),
  [avalanche.id]: http(DEFAULT_RPC_URLS.AVA),
  [optimism.id]: http(DEFAULT_RPC_URLS.OPT),
  [celo.id]: http(DEFAULT_RPC_URLS.CEL),
  [sonic.id]: http(DEFAULT_RPC_URLS.SNC),
  [unichain.id]: http(DEFAULT_RPC_URLS.UNI),
  [linea.id]: http(DEFAULT_RPC_URLS.LIN),
}

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
 * Like RainbowKit's `getDefaultConfig`, but with mobile WalletConnect fixes
 * applied by default:
 *
 * - Excludes the Base Account wallet from the default wallet list (pass an
 *   explicit `wallets` array to override).
 * - Clears stale WalletConnect v2 pairing data to prevent "No matching key"
 *   relay errors on mobile wallets.
 * - Registers Allbridge-compatible EVM chains (mainnet, Base, BNB, Polygon,
 *   Arbitrum, Avalanche, Optimism, Celo, Sonic, Unichain, Linea) so that
 *   wagmi operations work regardless of which network the wallet is on.
 * - Sets per-chain viem transports for the bridge chains to the same DRPC
 *   URLs used by the Allbridge SDK, so wagmi/viem reads don't fall back to
 *   viem's default RPCs (e.g. `eth.merkle.io`). Override per-chain via
 *   `params.transports`.
 * - Sets `walletConnectParameters.metadata.redirect.universal` to the current
 *   origin so that MetaMask Mobile redirects back to the browser tab after
 *   signing, allowing the WalletConnect relay response to be delivered.
 *
 * All defaults can be overridden by the caller.
 */
export const getDefaultConfig = (params: Parameters<typeof rkGetDefaultConfig>[0] & { debug?: boolean }) => {
  clearStaleWcPairings()

  const p = params as Record<string, any>
  const debug = !!p.debug
  const appUrl: string | undefined = p.appUrl ?? (typeof window !== 'undefined' ? window.location.origin : undefined)

  // Merge bridge-compatible chains with user chains so that wagmi operations
  // work regardless of which EVM network the wallet is currently on.
  // Bridge chains first (mainnet at index 0) so wagmi's auto-switch after
  // connect targets a real EVM chain, not a virtual one like algorandChain.
  const userChains: any[] = p.chains ?? []
  const bridgeChainIds = new Set(BRIDGE_CHAINS.map((c) => c.id))
  const extraUserChains = userChains.filter((c: any) => !bridgeChainIds.has(c.id))
  const chains = [...BRIDGE_CHAINS, ...extraUserChains]

  // Default mobile redirect so MetaMask Mobile returns to the browser tab.
  const redirectUrl: string | undefined = typeof window !== 'undefined' ? window.location.origin : undefined
  const userWcMeta = p.walletConnectParameters?.metadata ?? {}

  // Register all EVM methods used across use-wallet and use-wallet-ui as
  // optional WalletConnect session methods so the wallet routes them through
  // the WC channel instead of treating them as read-only RPC requests (which
  // can 403 on public RPCs like mainnet.base.org).
  const bridgeOptionalMethods = [
    'eth_call',
    'eth_chainId',
    'eth_blockNumber',
    'eth_sendTransaction',
    'eth_estimateGas',
    'eth_getTransactionReceipt',
    'eth_signTypedData_v4',
    'wallet_switchEthereumChain',
    'wallet_addEthereumChain',
    'wallet_getCapabilities',
    'wallet_sendCalls',
    'wallet_getCallsStatus',
  ]
  const userOptionalMethods: string[] = p.walletConnectParameters?.optionalMethods ?? []
  const optionalMethods = [
    ...new Set([...bridgeOptionalMethods, ...userOptionalMethods]),
  ]

  const walletConnectParameters = {
    ...p.walletConnectParameters,
    optionalMethods,
    ...(redirectUrl
      ? {
          metadata: {
            icons: [],
            ...userWcMeta,
            redirect: {
              universal: redirectUrl,
              ...userWcMeta.redirect,
            },
          },
        }
      : {}),
  }

  // Caller transports win over bridge defaults so users can swap in their own
  // RPCs (e.g. Alchemy/Infura keys) per chain.
  const userTransports = (p.transports ?? {}) as Record<number, Transport>
  const transports = { ...BRIDGE_TRANSPORTS, ...userTransports }

  const config = rkGetDefaultConfig({
    wallets: DEFAULT_WALLETS,
    ...params,
    chains: chains as any,
    transports,
    ...(appUrl ? { appUrl } : {}),
    ...(walletConnectParameters ? { walletConnectParameters } : {}),
  })

  if (debug) {
    // Debug: log wagmi state transitions (connections, chain changes)
    config.subscribe(
      (state) => ({
        chainId: state.chainId,
        current: state.current,
        status: state.status,
        connections: state.connections.size,
      }),
      (next, prev) => {
        console.log('[wagmi] state change', { prev, next })
      },
    )

    // Debug: log connector events and wrap provider requests
    for (const connector of config.connectors) {
      connector.emitter.on('connect', (data: any) => {
        console.log(`[wagmi] connector "${connector.name}" connect`, data)
      })
      connector.emitter.on('disconnect', () => {
        console.log(`[wagmi] connector "${connector.name}" disconnect`)
      })
      connector.emitter.on('change', (data: any) => {
        console.log(`[wagmi] connector "${connector.name}" change`, data)
      })

      // Wrap getProvider to log all EIP-1193 request/response traffic.
      // We return a Proxy instead of mutating provider.request so that
      // MetaMask SDK's internal this.request calls stay on the untouched
      // original provider and don't recurse through our logging layer.
      const origGetProvider = connector.getProvider.bind(connector)
      let cachedProxy: any = null
      let cachedTarget: any = null
      connector.getProvider = async (...args: any[]) => {
        const provider = await origGetProvider(...args)
        if (!provider) return provider
        // Re-use the same Proxy for the same underlying provider
        if (cachedTarget === provider) return cachedProxy
        cachedTarget = provider
        cachedProxy = new Proxy(provider, {
          get(target, prop, receiver) {
            if (prop === 'request') {
              return async (req: { method: string; params?: unknown[] }) => {
                console.log(`[wagmi:rpc] >> ${connector.name} ${req.method}`, req.params ?? [])
                try {
                  const result = await (target as Record<string, Function>).request(req)
                  console.log(`[wagmi:rpc] << ${connector.name} ${req.method}`, result)
                  return result
                } catch (err) {
                  console.error(`[wagmi:rpc] ERR ${connector.name} ${req.method}`, err)
                  throw err
                }
              }
            }
            return Reflect.get(target, prop, receiver)
          },
        })
        return cachedProxy
      }
    }
  }

  return config
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
