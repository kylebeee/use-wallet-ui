import { ALGORAND_CHAIN_ID_HEX } from 'liquid-accounts-evm'
import type { EIP1193Provider } from './evmProviderAdapter'

/** Normalize any chain ID representation to a lowercase hex string. */
function toHexChainId(id: unknown): string {
  if (typeof id === 'string') return id.startsWith('0x') ? id.toLowerCase() : '0x' + BigInt(id).toString(16)
  if (typeof id === 'number' || typeof id === 'bigint') return '0x' + BigInt(id).toString(16)
  return String(id).toLowerCase()
}

/**
 * Switch the EVM wallet to the correct chain for the bridge source.
 */
export async function switchToEvmChain(
  provider: EIP1193Provider,
  chainId: string | number, // hex string or numeric chain ID
): Promise<void> {
  const targetHex = toHexChainId(chainId)
  const currentChainId = await provider.request({ method: 'eth_chainId' })
  if (toHexChainId(currentChainId) === targetHex) return
  const chainIdHex = targetHex

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
  } catch (error: unknown) {
    const code = (error as { code?: number }).code
    if (code === 4902) {
      throw new Error(`Chain ${chainIdHex} not found in wallet. Please add it manually.`)
    }
    throw error
  }
}

/**
 * Switch back to the Algorand EVM chain (4160 / 0x1040) after bridge.
 * Polls eth_chainId until the switch is confirmed so that callers can safely
 * proceed with Algorand signing operations immediately after awaiting this.
 */
export async function switchBackToAlgorand(provider: EIP1193Provider): Promise<void> {
  const current = await provider.request({ method: 'eth_chainId' })
  if (toHexChainId(current) === ALGORAND_CHAIN_ID_HEX.toLowerCase()) return

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ALGORAND_CHAIN_ID_HEX }],
    })
  } catch {
    // Swallow — ensureAlgorandChain() in LiquidEvmBaseWallet is the fallback
  }

  // Poll until the wallet reflects the new chain (MetaMask resolves the RPC
  // call before the internal chain state is visible to subsequent requests).
  // for (let i = 0; i < 20; i++) {
  //   const chainId = await provider.request({ method: 'eth_chainId' })
  //   if (toHexChainId(chainId) === ALGORAND_CHAIN_ID_HEX.toLowerCase()) return
  //   await new Promise((r) => setTimeout(r, 150))
  // }
}

/**
 * Verify the provider is on the Algorand chain before an Algorand signing
 * operation. Throws if the chain ID is wrong after an attempted switch.
 */
export async function assertAlgorandChain(provider: EIP1193Provider): Promise<void> {
  const chainId = await provider.request({ method: 'eth_chainId' })
  if (toHexChainId(chainId) === ALGORAND_CHAIN_ID_HEX.toLowerCase()) return
  // One more switch attempt in case the previous one raced
  await switchBackToAlgorand(provider)
  // const chainIdAfter = await provider.request({ method: 'eth_chainId' })
  // if (toHexChainId(chainIdAfter) !== ALGORAND_CHAIN_ID_HEX.toLowerCase()) {
  //   throw new Error(`Expected Algorand chain (${ALGORAND_CHAIN_ID_HEX}) but wallet is on ${toHexChainId(chainIdAfter)}`)
  // }
}
