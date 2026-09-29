import { useState } from 'react'
import { Pencil, Trash2, User } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ReactionButton } from '@/components/retrospective/reaction-button'
import { CommentForm } from '@/components/retrospective/comment-form'
import { formatRelativeTime } from '@/lib/utils'
import type { Comment } from '@/types/domain'
import type { CommentFormInput } from '@/schemas'

interface CommentCardProps {
  comment: Comment
  accentColor: string
  showReactions: boolean
  showAssignee: boolean
  isBoardActive: boolean
  onToggleReaction: () => void
  onUpdate: (values: CommentFormInput) => Promise<void>
  onDelete: () => Promise<void>
}

export function CommentCard({
  comment,
  accentColor,
  showReactions,
  showAssignee,
  isBoardActive,
  onToggleReaction,
  onUpdate,
  onDelete,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isPending = comment.id.startsWith('optimistic-')

  if (isEditing) {
    return (
      <CommentForm
        columnType={comment.columnType}
        accentColor={accentColor}
        onCancel={() => setIsEditing(false)}
        onSubmit={async (values) => {
          await onUpdate(values)
          setIsEditing(false)
        }}
      />
    )
  }

  return (
    <div
      className="animate-card-in group flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <p className="text-sm leading-relaxed text-balance">{comment.content}</p>

      {showAssignee && comment.assignee && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          <User className="size-3" />
          {comment.assignee}
        </span>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.authorName}</span>
          {' · '}
          {formatRelativeTime(comment.createdAt)}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          {comment.isOwn && isBoardActive && !isPending && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsEditing(true)}
                aria-label="Editar comentario"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setConfirmOpen(true)}
                aria-label="Eliminar comentario"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
          {showReactions && (
            <ReactionButton
              count={comment.reactionCount}
              reactedBySelf={comment.reactedBySelf}
              reactorNames={comment.reactorNames}
              disabled={!isBoardActive || isPending}
              onToggle={onToggleReaction}
            />
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este comentario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El comentario se va a borrar para todo el equipo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault()
                setIsDeleting(true)
                try {
                  await onDelete()
                  setConfirmOpen(false)
                } finally {
                  setIsDeleting(false)
                }
              }}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
