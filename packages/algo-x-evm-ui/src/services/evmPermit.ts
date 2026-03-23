import type { EIP1193Provider } from './evmProviderAdapter'

export interface PermitDetectResult {
  supported: true
  nonce: bigint
}

export interface PermitNotSupported {
  supported: false
}

/**
 * Detect EIP-2612 permit support by probing the nonces(address) function.
 * Selector: keccak256("nonces(address)") = 0x7ecebe00
 */
export async function detectEip2612(
  tokenAddress: string,
  ownerAddress: string,
  provider: EIP1193Provider,
): Promise<PermitDetectResult | PermitNotSupported> {
  try {
    const paddedOwner = ownerAddress.toLowerCase().replace('0x', '').padStart(64, '0')
    const callData = '0x7ecebe00' + paddedOwner

    const result = (await provider.request({
      method: 'eth_call',
      params: [{ to: tokenAddress, data: callData }, 'latest'],
    })) as string

    if (!result || result === '0x' || result === '0x0') {
      return { supported: false }
    }

    const nonce = BigInt(result)
    return { supported: true, nonce }
  } catch {
    return { supported: false }
  }
}

export interface PermitSignature {
  v: number
  r: string
  s: string
}

export interface BuildPermitParams {
  provider: EIP1193Provider
  tokenAddress: string
  ownerAddress: string
  spenderAddress: string
  value: bigint
  nonce: bigint
  deadline: bigint
  chainId: bigint
}

/**
 * ABI decode a string from eth_call result (dynamic type, offset 0x20, then length, then data).
 */
function decodeAbiString(hex: string): string {
  // Remove 0x prefix
  const data = hex.startsWith('0x') ? hex.slice(2) : hex
  if (data.length < 128) return ''
  // offset at 0x00 (should be 0x20 = 32)
  // length at 0x20
  const length = parseInt(data.slice(64, 128), 16)
  if (length === 0) return ''
  const strHex = data.slice(128, 128 + length * 2)
  return Buffer.from(strHex, 'hex').toString('utf8')
}

/**
 * Build and sign an EIP-712 permit signature.
 */
export async function buildPermitSignature({
  provider,
  tokenAddress,
  ownerAddress,
  spenderAddress,
  value,
  nonce,
  deadline,
  chainId,
}: BuildPermitParams): Promise<PermitSignature> {
  // Fetch token name — selector: keccak256("name()") = 0x06fdde03
  const nameResult = (await provider.request({
    method: 'eth_call',
    params: [{ to: tokenAddress, data: '0x06fdde03' }, 'latest'],
  })) as string
  const tokenName = decodeAbiString(nameResult)

  // Fetch token version — selector: keccak256("version()") = 0x54fd4d50
  let tokenVersion = '1'
  try {
    const versionResult = (await provider.request({
      method: 'eth_call',
      params: [{ to: tokenAddress, data: '0x54fd4d50' }, 'latest'],
    })) as string
    const decoded = decodeAbiString(versionResult)
    if (decoded) tokenVersion = decoded
  } catch {
    // fallback to "1"
  }

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    domain: {
      name: tokenName,
      version: tokenVersion,
      chainId: chainId.toString(),
      verifyingContract: tokenAddress,
    },
    primaryType: 'Permit',
    message: {
      owner: ownerAddress,
      spender: spenderAddress,
      value: value.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    },
  }

  const signature = (await provider.request({
    method: 'eth_signTypedData_v4',
    params: [ownerAddress, JSON.stringify(typedData)],
  })) as string

  // Parse 65-byte signature: r(32) + s(32) + v(1)
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature
  const r = '0x' + sig.slice(0, 64)
  const s = '0x' + sig.slice(64, 128)
  const v = parseInt(sig.slice(128, 130), 16)

  return { v, r, s }
}

export interface EncodePermitParams {
  owner: string
  spender: string
  value: bigint
  deadline: bigint
  v: number
  r: string
  s: string
}

/**
 * Encode calldata for permit(address,address,uint256,uint256,uint8,bytes32,bytes32).
 * Selector: keccak256("permit(address,address,uint256,uint256,uint8,bytes32,bytes32)") = 0xd505accf
 */
export function encodePermitCalldata({ owner, spender, value, deadline, v, r, s }: EncodePermitParams): string {
  const pad32 = (hex: string) => hex.replace('0x', '').padStart(64, '0')
  const pad32Addr = (addr: string) => addr.toLowerCase().replace('0x', '').padStart(64, '0')
  const pad32BigInt = (n: bigint) => n.toString(16).padStart(64, '0')

  return (
    '0xd505accf' +
    pad32Addr(owner) +
    pad32Addr(spender) +
    pad32BigInt(value) +
    pad32BigInt(deadline) +
    pad32(v.toString(16)) +
    pad32(r) +
    pad32(s)
  )
}

/**
 * Extract the spender address from an ERC-20 approve(address,uint256) calldata.
 * Selector: 0x095ea7b3, followed by 32-byte spender (padded), 32-byte amount.
 */
export function extractSpenderFromApproveTx(approveTx: { data: string }): string {
  const data = approveTx.data
  // Skip "0x" (2 chars) + selector (8 chars) = 10 chars
  // 32-byte param: first 12 bytes (24 chars) are zero-padding, last 20 bytes (40 chars) are address
  return '0x' + data.slice(10 + 24, 10 + 64)
}
