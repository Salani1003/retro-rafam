import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  userId: string | null
  isReady: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextValue>({ userId: null, isReady: false, error: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function ensureSession() {
      try {
        const { data: existing } = await supabase.auth.getSession()

        if (existing.session?.user) {
          if (mounted) {
            setUserId(existing.session.user.id)
            setIsReady(true)
          }
          return
        }

        const { data, error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) throw signInError

        if (mounted) {
          setUserId(data.session?.user.id ?? null)
          setIsReady(true)
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'No se pudo iniciar sesión anónima con Supabase.'
          )
          setIsReady(true)
        }
      }
    }

    ensureSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUserId(session?.user.id ?? null)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ userId, isReady, error }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
