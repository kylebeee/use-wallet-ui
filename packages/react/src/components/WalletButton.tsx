import { useWallet } from '@txnlab/use-wallet-react'
import React from 'react'

import { ConnectedWalletButton } from './ConnectedWalletButton'
import { ConnectedWalletMenu, type ConnectedWalletMenuProps } from './ConnectedWalletMenu'
import { type ButtonSize, ConnectWalletButton } from './ConnectWalletButton'
import { ConnectWalletMenu } from './ConnectWalletMenu'

export interface WalletButtonProps {
  /** Size variant for the button */
  size?: ButtonSize
  /** Additional CSS classes to apply to the button */
  className?: string
  /** Inline styles to apply to the button (can include CSS variable overrides) */
  style?: React.CSSProperties
  /** Swap integration options. When provided, enables the Swap panel. */
  swap?: ConnectedWalletMenuProps['swap']
}

export function WalletButton({ size, className, style, swap }: WalletButtonProps) {
  const { activeAddress } = useWallet()

  // If connected, show the connected wallet menu
  if (activeAddress) {
    return (
      <ConnectedWalletMenu swap={swap}>
        <ConnectedWalletButton size={size} className={className} style={style} />
      </ConnectedWalletMenu>
    )
  }

  // If not connected, show the ConnectWalletMenu with customized button
  return (
    <ConnectWalletMenu>
      <ConnectWalletButton size={size} className={className} style={style} />
    </ConnectWalletMenu>
  )
}
