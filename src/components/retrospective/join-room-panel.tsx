import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { joinRetrospectiveSchema, type JoinRetrospectiveInput } from '@/schemas'
import { getSavedDisplayName } from '@/lib/local-participant'

interface JoinRoomPanelProps {
  roomCode: string
  teamName?: string | null
  title?: string | null
  isClosed: boolean
  onJoin: (displayName: string) => Promise<void>
}

export function JoinRoomPanel({ roomCode, teamName, title, isClosed, onJoin }: JoinRoomPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinRetrospectiveInput>({
    resolver: zodResolver(joinRetrospectiveSchema),
    defaultValues: { displayName: getSavedDisplayName() },
  })

  async function submit(values: JoinRetrospectiveInput) {
    setIsSubmitting(true)
    try {
      await onJoin(values.displayName)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
      <Card className="flex w-full max-w-sm flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex size-10 items-center justify-center rounded-full"
            style={{ background: 'var(--accent)' }}
          >
            <MessagesSquare className="size-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{title || 'Retrospectiva de equipo'}</h1>
            {teamName && <p className="text-sm text-muted-foreground">{teamName}</p>}
            <p className="mt-1 font-[var(--font-mono)] text-xs tracking-widest text-muted-foreground">
              {roomCode}
            </p>
          </div>
        </div>

        {isClosed && (
          <p className="rounded-[var(--radius-sm)] bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            Esta retrospectiva ya finalizó. Podés unirte para ver el tablero en modo lectura.
          </p>
        )}

        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tu nombre</Label>
            <Input placeholder="Ej: Martín" autoFocus {...register('displayName')} />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Uniéndote…' : 'Entrar al tablero'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
