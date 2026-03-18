import type { ReactNode } from 'react'

export function SecondaryButton({ onClick, className, children }: { onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-2 px-4 border border-[var(--wui-color-border)] text-[var(--wui-color-text-secondary)] font-medium rounded-xl hover:brightness-90 transition-all text-sm ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
