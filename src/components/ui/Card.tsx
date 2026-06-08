import { type HTMLAttributes, type ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: ReactNode
}

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

export function Card({ padding = 'md', className = '', children, ...rest }: Props) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm ${PADDING[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}
