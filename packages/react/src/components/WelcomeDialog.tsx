import {
  useFloating,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useId,
} from '@floating-ui/react'
import { useState } from 'react'
import { WelcomeContent } from '@d13co/algo-x-evm-ui'

import { useWalletUI } from '../providers/WalletUIProvider'
import { useBridgeDialog } from '../providers/BridgeDialogProvider'

interface WelcomeDialogProps {
  algorandAddress: string
  evmAddress: string
  onDismiss: () => void
}

export function WelcomeDialog({ algorandAddress, evmAddress, onDismiss }: WelcomeDialogProps) {
  const { theme } = useWalletUI()
  const { bridge, openBridge } = useBridgeDialog()
  const [animationState, setAnimationState] = useState<'starting' | 'entered' | 'exiting' | null>('starting')

  const handleClose = () => {
    setAnimationState('exiting')
    setTimeout(() => onDismiss(), 150)
  }

  const dataTheme = theme === 'system' ? undefined : theme

  const { refs, context } = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) handleClose()
    },
  })

  const dismiss = useDismiss(context, { outsidePress: false })
  const role = useRole(context, { role: 'dialog' })
  const { getFloatingProps } = useInteractions([dismiss, role])

  const labelId = useId()
  const descriptionId = useId()

  // Trigger enter animation
  if (animationState === 'starting') {
    requestAnimationFrame(() => setAnimationState('entered'))
  }

  return (
    <FloatingPortal id="wallet-welcome-dialog-portal">
      <div data-wallet-theme data-wallet-ui data-theme={dataTheme}>
        <FloatingOverlay
          className="grid place-items-center px-4 z-[100] transition-opacity duration-150 ease-in-out bg-[var(--wui-color-overlay)] data-[state=starting]:opacity-0 data-[state=exiting]:opacity-0 data-[state=entered]:opacity-100"
          data-state={animationState}
          lockScroll
        >
          <FloatingFocusManager context={context} modal={true}>
            <div
              ref={refs.setFloating}
              {...getFloatingProps({
                'aria-labelledby': labelId,
                'aria-describedby': descriptionId,
              })}
              role="dialog"
              data-state={animationState}
              className="w-full max-w-md rounded-3xl bg-[var(--wui-color-bg)] shadow-xl transform transition-all duration-150 ease-in-out data-[state=starting]:opacity-0 data-[state=starting]:scale-90 data-[state=exiting]:opacity-0 data-[state=exiting]:scale-90 data-[state=entered]:opacity-100 data-[state=entered]:scale-100"
              style={{ marginTop: '-0.5rem' }}
            >
              <WelcomeContent
                algorandAddress={algorandAddress}
                evmAddress={evmAddress}
                onClose={handleClose}
                labelId={labelId}
                descriptionId={descriptionId}
                bridgeAvailable={bridge.isAvailable}
                onBridgeClick={openBridge}
              />
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      </div>
    </FloatingPortal>
  )
}
