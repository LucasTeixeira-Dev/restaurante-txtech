import { cn } from '@/utils/cn'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

const variants: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

// Helpers de status de pedido
export function statusPedidoBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    aberto: { label: 'Aberto', variant: 'info' },
    em_preparo: { label: 'Em preparo', variant: 'orange' },
    pronto: { label: 'Pronto', variant: 'success' },
    entregue: { label: 'Entregue', variant: 'default' },
    cancelado: { label: 'Cancelado', variant: 'danger' },
  }
  return map[status] ?? { label: status, variant: 'default' as Variant }
}

export function statusMesaBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    livre: { label: 'Livre', variant: 'success' },
    ocupada: { label: 'Ocupada', variant: 'danger' },
    reservada: { label: 'Reservada', variant: 'warning' },
  }
  return map[status] ?? { label: status, variant: 'default' as Variant }
}

export function statusItemBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    pendente: { label: 'Pendente', variant: 'warning' },
    em_preparo: { label: 'Em preparo', variant: 'orange' },
    pronto: { label: 'Pronto', variant: 'success' },
    cancelado: { label: 'Cancelado', variant: 'danger' },
  }
  return map[status] ?? { label: status, variant: 'default' as Variant }
}
