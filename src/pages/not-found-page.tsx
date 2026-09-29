import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="font-[var(--font-display)] text-2xl font-semibold">
        No encontramos esta página
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        El enlace puede estar mal escrito o ya no existir. Volvé al inicio para crear o unirte a
        una retrospectiva.
      </p>
      <Button asChild className="mt-2">
        <Link to="/">Ir al inicio</Link>
      </Button>
    </div>
  )
}
