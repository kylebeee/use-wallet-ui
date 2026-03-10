import { useState } from 'react'

interface CopyButtonProps {
  text: string
  /** 'text' shows COPY/COPIED/ERROR labels; 'icon' shows a clipboard icon */
  variant?: 'text' | 'icon'
  className?: string
  title?: string
}

export function CopyButton({ text, variant = 'text', className, title = 'Copy' }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 1000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 1000)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        className={
          className ??
          'ml-1 p-0.5 rounded hover:bg-[var(--wui-color-bg-secondary)] text-[var(--wui-color-text-tertiary)] hover:text-[var(--wui-color-text-secondary)] transition-colors'
        }
        title={state === 'copied' ? 'Copied!' : state === 'error' ? 'Error' : title}
      >
        {state === 'copied' ? (
          // Checkmark
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          // Clipboard icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleCopy}
      className={
        className ??
        'shrink-0 px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--wui-color-bg-tertiary)] hover:brightness-90 transition-all'
      }
      style={{
        color:
          state === 'copied'
            ? 'var(--wui-color-success-text, #16a34a)'
            : state === 'error'
              ? 'var(--wui-color-danger-text)'
              : 'var(--wui-color-text-secondary)',
      }}
    >
      {state === 'copied' ? 'COPIED' : state === 'error' ? 'ERROR' : 'COPY'}
    </button>
  )
}
