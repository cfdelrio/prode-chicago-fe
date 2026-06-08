import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'dark' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-[#0042A5] text-white hover:bg-[#003080] disabled:opacity-50',
  dark: 'bg-[#001A4B] text-white hover:bg-[#002870] disabled:opacity-50',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
  ghost: 'bg-transparent text-[#0042A5] hover:bg-[#0042A5]/10 disabled:opacity-50',
}

const SIZE: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-5 py-3 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', fullWidth, loading, disabled, className = '', children, type = 'button', ...rest },
  ref,
) {
  const base = 'font-bold transition-colors inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed'
  const width = fullWidth ? 'w-full' : ''
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${base} ${VARIANT[variant]} ${SIZE[size]} ${width} ${className}`.trim()}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
})
