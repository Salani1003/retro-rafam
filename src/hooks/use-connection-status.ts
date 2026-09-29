import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ConnectionStatus } from '@/types/domain'

/**
 * Deriva un estado de conexión simple a partir de los eventos del canal de Realtime
 * y del estado online/offline del navegador.
 */
export function useConnectionStatus(channel: RealtimeChannel | null): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting')

  useEffect(() => {
    function handleOffline() {
      setStatus('disconnected')
    }
    function handleOnline() {
      setStatus('reconnecting')
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    if (!channel) {
      setStatus('reconnecting')
      return
    }

    if (!navigator.onLine) {
      setStatus('disconnected')
      return
    }

    const interval = setInterval(() => {
      if (!navigator.onLine) {
        setStatus('disconnected')
        return
      }
      const state = channel.state
      if (state === 'joined') setStatus('connected')
      else if (state === 'closed' || state === 'errored') setStatus('disconnected')
      else setStatus('reconnecting')
    }, 1500)

    return () => clearInterval(interval)
  }, [channel])

  return status
}
