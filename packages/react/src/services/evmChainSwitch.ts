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
