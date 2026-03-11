import { type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit'
import { RainbowKitBridge, type RainbowKitBridgeState, type WagmiConfig } from './RainbowKitBridge'
import type { ResolvedTheme } from '../hooks/useResolvedTheme'

/**
 * Create a bound Provider component for use by WalletUIProvider.
 * Called once by `createRainbowKitConfig` — the returned component captures
 * `wagmiConfig` and `bridgeState` in closure so WalletUIProvider only needs
 * to pass `queryClient`, `resolvedTheme`, `walletManager`, and `children`.
 */
export function createBoundProvider(wagmiConfig: WagmiConfig, bridgeState: RainbowKitBridgeState) {
  return function RainbowKitAutoProvider({
    queryClient,
    resolvedTheme,
    walletManager,
    children,
  }: {
    queryClient: QueryClient
    resolvedTheme: ResolvedTheme
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletManager: any
    children: ReactNode
  }) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={resolvedTheme === 'dark' ? darkTheme() : lightTheme()}>
            <RainbowKitBridge walletManager={walletManager} state={bridgeState} />
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    )
  }
}
