/**
 * EIP-1193 provider interface (MetaMask/Rainbow/etc).
 */
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}
