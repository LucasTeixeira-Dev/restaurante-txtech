import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

export function LoadingSpinner({ className, size = 'md', label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-brand-500', sizes[size])} />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" label="Carregando..." />
    </div>
  )
}
