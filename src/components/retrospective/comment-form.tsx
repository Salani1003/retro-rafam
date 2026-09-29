import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { commentFormSchema, type CommentFormInput } from '@/schemas'
import type { ColumnType } from '@/types/database'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 500

interface CommentFormProps {
  columnType: ColumnType
  accentColor: string
  onSubmit: (values: CommentFormInput) => Promise<void>
  onCancel: () => void
}

export function CommentForm({ columnType, accentColor, onSubmit, onCancel }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CommentFormInput>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: '', assignee: '' },
  })

  const content = watch('content') ?? ''

  async function submit(values: CommentFormInput) {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="animate-card-in flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-card p-3 shadow-sm"
    >
      <Textarea
        autoFocus
        placeholder="Escribí tu comentario…"
        maxLength={MAX_LENGTH}
        className="min-h-20 resize-none border-none bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0"
        {...register('content')}
      />

      {columnType === 'action' && (
        <Input
          placeholder="Responsable (opcional)"
          className="h-8 text-xs"
          {...register('assignee')}
        />
      )}

      {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}

      <div className="flex items-center justify-between pt-1">
        <span
          className={cn(
            'text-xs tabular-nums',
            content.length > MAX_LENGTH - 40 ? 'text-column-okay' : 'text-muted-foreground'
          )}
        >
          {content.length}/{MAX_LENGTH}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            style={{ background: accentColor }}
            className="text-white hover:opacity-90 dark:text-background"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </form>
  )
}
