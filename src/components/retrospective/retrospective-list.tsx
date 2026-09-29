import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DeleteRetrospectiveDialog } from '@/components/retrospective/delete-retrospective-dialog'
import { deleteRetrospective, listRetrospectives } from '@/services/retrospectives'
import { toUserMessage } from '@/lib/errors'

export function RetrospectiveList({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['retrospectives'],
    queryFn: listRetrospectives,
    enabled,
  })

  async function handleDelete(id: string) {
    try {
      await deleteRetrospective(id)
      await queryClient.invalidateQueries({ queryKey: ['retrospectives'] })
      toast.success('Retrospectiva eliminada')
    } catch (err) {
      toast.error(toUserMessage(err, 'No pudimos eliminar la retrospectiva.'))
      throw err
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Retros del equipo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Las más recientes primero. Tocá una para entrar o verla en modo lectura.
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          {toUserMessage(error, 'No pudimos cargar las retros.')}
        </p>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay retros. Creá la primera.</p>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((retro) => {
            const name = retro.title || 'Retrospectiva de equipo'
            return (
              <div key={retro.id} className="relative">
                <Link to={`/retro/${retro.roomCode}`} className="block h-full">
                  <Card className="flex h-full flex-col gap-2 p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      <Badge variant={retro.status === 'active' ? 'default' : 'secondary'}>
                        {retro.status === 'active' ? 'Activa' : 'Finalizada'}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {retro.teamName ?? 'Sin equipo asignado'}
                    </p>
                    <p className="mt-auto flex items-center gap-3 pr-9 text-xs text-muted-foreground">
                      <span className="font-[var(--font-mono)] tracking-widest">{retro.roomCode}</span>
                      <span>
                        {new Date(retro.createdAt).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </Card>
                </Link>
                <div className="absolute right-2 bottom-2">
                  <DeleteRetrospectiveDialog
                    retrospectiveName={name}
                    onConfirm={() => handleDelete(retro.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
