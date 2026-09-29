import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConnectionStatus } from '@/types/domain'

const CONFIG: Record<ConnectionStatus, { label: string; icon: typeof Wifi; className: string }> = {
  connected: { label: 'Conectado', icon: Wifi, className: 'text-column-good' },
  reconnecting: { label: 'Reconectando…', icon: RefreshCw, className: 'text-column-okay' },
  disconnected: { label: 'Sin conexión', icon: WifiOff, className: 'text-destructive' },
}

export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const { label, icon: Icon, className } = CONFIG[status]

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium', className)}>
      <Icon className={cn('size-3.5', status === 'reconnecting' && 'animate-spin')} />
      <span>{label}</span>
    </div>
  )
}
