import { type ReactNode, useState, useRef, useEffect, useCallback } from 'react'
import type { AssetHoldingDisplay } from './ManagePanel'
import { VerifiedBadge, SuspiciousBadge, ChevronDown } from './icons'

interface AssetOption {
  value: string
  label: string
  logo?: string | null
  /** Custom icon ReactNode — takes priority over logo/fallback */
  icon?: ReactNode
  verificationTier?: AssetHoldingDisplay['verificationTier']
}

interface AssetSelectProps {
  value: string
  onChange: (value: string) => void
  options: AssetOption[]
  className?: string
  /** Hide icons in the trigger and dropdown (useful for plain chain/token selects) */
  hideIcons?: boolean
}

function AssetIcon({ option, size = 16 }: { option: AssetOption; size?: number }) {
  if (option.icon) {
    return <span className="shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>{option.icon}</span>
  }
  if (option.logo) {
    return (
      <img
        src={option.logo}
        alt={option.label}
        width={size}
        height={size}
        className="rounded-full shrink-0 object-cover"
        loading="lazy"
      />
    )
  }
  return (
    <span
      className="rounded-full bg-[var(--wui-color-bg-tertiary)] shrink-0 flex items-center justify-center font-medium text-[var(--wui-color-text-secondary)]"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {(option.label || '?').charAt(0).toUpperCase()}
    </span>
  )
}

function Badge({ tier }: { tier?: AssetOption['verificationTier'] }) {
  if (tier === 'verified' || tier === 'trusted') return <VerifiedBadge size={11} className="shrink-0" />
  if (tier === 'suspicious') return <SuspiciousBadge size={11} className="shrink-0" />
  return null
}

export function AssetSelect({ value, onChange, options, className, hideIcons }: AssetSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value) ?? options[0]
  const showIcons = !hideIcons

  const handleSelect = useCallback((val: string) => {
    onChange(val)
    setOpen(false)
  }, [onChange])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg-secondary)] py-2.5 pl-2.5 pr-7 text-sm text-[var(--wui-color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--wui-color-primary)] focus:border-transparent transition-colors text-left"
      >
        {showIcons && selected && <AssetIcon option={selected} />}
        <span className="truncate min-w-0">{selected?.label ?? ''}</span>
        {selected && <Badge tier={selected.verificationTier} />}
        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--wui-color-text-secondary)] pointer-events-none" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 min-w-full w-max max-w-[280px] max-h-[200px] overflow-y-auto rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-bg)] shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center gap-1.5 px-2.5 py-2 text-sm transition-colors hover:bg-[var(--wui-color-bg-secondary)] ${
                option.value === value ? 'bg-[var(--wui-color-bg-secondary)] font-medium' : ''
              } text-[var(--wui-color-text)] text-left`}
            >
              {showIcons && <AssetIcon option={option} />}
              <span className="whitespace-nowrap">{option.label}</span>
              <Badge tier={option.verificationTier} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
