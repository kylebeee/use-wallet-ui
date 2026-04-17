import { useWallet } from '@txnlab/use-wallet-react'
import React from 'react'

import { useNfd } from '../hooks/useNfd'
import { cn } from '../utils'

import { NfdAvatar } from './NfdAvatar'

import type { ButtonSize } from './ConnectWalletButton'

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-1.5 pl-2 md:pl-2.5 pr-2 text-sm rounded-lg',
  md: 'py-2.5 pl-3 md:pl-3.5 pr-3 text-base rounded-xl',
  lg: 'py-3 pl-3.5 md:pl-4 pr-3.5 text-lg rounded-xl',
}

const avatarSizes: Record<ButtonSize, number> = {
  sm: 20,
  md: 24,
  lg: 28,
}

const avatarContainerClasses: Record<ButtonSize, string> = {
  sm: 'mr-1 md:mr-1.5 h-5 w-5',
  md: 'mr-1 md:mr-2 h-6 w-6',
  lg: 'mr-1.5 md:mr-2.5 h-7 w-7',
}

const chevronSizes: Record<ButtonSize, { width: number; height: number }> = {
  sm: { width: 14, height: 14 },
  md: { width: 18, height: 18 },
  lg: { width: 20, height: 20 },
}

export interface ConnectedWalletButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Size variant for the button */
  size?: ButtonSize
  style?: React.CSSProperties
}

export const ConnectedWalletButton = React.forwardRef<
  HTMLButtonElement,
  ConnectedWalletButtonProps
>(({ className = '', children, style, size = 'md', ...props }, ref) => {
  const { activeAddress } = useWallet()

  // NFD for the active address
  const nfdQuery = useNfd({ enabled: !!activeAddress })
  const nfdName = nfdQuery.data?.name ?? null

  // Base styles using CSS custom properties for theming
  const baseStyles =
    'flex items-center bg-[var(--wui-color-primary)] transition-colors hover:bg-[var(--wui-color-primary-hover)] text-[var(--wui-color-primary-text)] cursor-pointer font-bold'

  return (
    <button
      ref={ref}
      data-wallet-ui
      data-wallet-button
      className={cn(baseStyles, sizeClasses[size], className)}
      style={style}
      disabled={false}
      {...props}
      type="button"
    >
      {children || (
        <div className="flex items-center">
          {/* Avatar */}
          {activeAddress && (
            <div className={cn('overflow-hidden', avatarContainerClasses[size])}>
              <NfdAvatar
                nfd={nfdQuery.data}
                alt={`${nfdName || activeAddress} avatar`}
                size={avatarSizes[size]}
                lightOnly
              />
            </div>
          )}

          <span className="hidden md:block max-w-[160px] truncate">
            {nfdName ||
              (activeAddress
                ? `${activeAddress.slice(0, 6)}..${activeAddress.slice(-4)}`
                : 'Connect')}
          </span>

          {/* Chevron icon */}
          {activeAddress && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={chevronSizes[size].width}
              height={chevronSizes[size].height}
              viewBox="0 0 16 16"
              fill="none"
              className="ml-1.5 mt-0.5"
              aria-hidden="true"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}
    </button>
  )
})

ConnectedWalletButton.displayName = 'ConnectedWalletButton'
