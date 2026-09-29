import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useBoard } from '@/hooks/use-board'
import { getRetrospectiveByCode, joinRetrospective, closeRetrospective } from '@/services/retrospectives'
import { findOwnParticipant } from '@/services/participants'
import { createComment, updateComment, deleteComment } from '@/services/comments'
import { toggleReaction } from '@/services/reactions'
import { saveDisplayName } from '@/lib/local-participant'
import { toUserMessage } from '@/lib/errors'
import { JoinRoomPanel } from '@/components/retrospective/join-room-panel'
import { RetrospectiveBoard } from '@/components/retrospective/retrospective-board'
import { ColumnSkeleton } from '@/components/retrospective/column-skeleton'
import { MessagesSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { ColumnType, CommentRow } from '@/types/database'
import type { CommentFormInput } from '@/schemas'

export function BoardPage() {
  const { code = '' } = useParams<{ code: string }>()
  const { userId, isReady, error: authError } = useAuth()
  const queryClient = useQueryClient()

  const retrospectiveQuery = useQuery({
    queryKey: ['retrospective', code],
    queryFn: () => getRetrospectiveByCode(code),
    enabled: isReady && !authError,
  })

  const retrospectiveId = retrospectiveQuery.data?.id ?? null

  const ownParticipantQuery = useQuery({
    queryKey: ['own-participant', retrospectiveId, userId],
    queryFn: () => findOwnParticipant(retrospectiveId as string, userId as string),
    enabled: Boolean(retrospectiveId && userId),
  })

  const board = useBoard(retrospectiveId, userId)

  const retrospective = useMemo(() => {
    if (!retrospectiveQuery.data) return null
    if (board.retrospectivePatch && board.retrospectivePatch.id === retrospectiveQuery.data.id) {
      return board.retrospectivePatch
    }
    return retrospectiveQuery.data
  }, [retrospectiveQuery.data, board.retrospectivePatch])

  if (authError) {
    return (
      <StatusScreen
        title="No pudimos conectar"
        description={`Revisá la configuración de Supabase en tu archivo .env. (${authError})`}
      />
    )
  }

  if (!isReady || retrospectiveQuery.isLoading) {
    return <BoardSkeleton />
  }

  if (retrospectiveQuery.isError) {
    return (
      <StatusScreen
        title="Algo salió mal"
        description={toUserMessage(retrospectiveQuery.error, 'No pudimos cargar esta retro.')}
      />
    )
  }

  if (!retrospective) {
    return (
      <StatusScreen
        title="Sala no encontrada"
        description="No encontramos ninguna retro con ese código. Revisá el enlace o el código e intentá de nuevo."
      />
    )
  }

  if (ownParticipantQuery.isLoading) {
    return <BoardSkeleton />
  }

  if (!ownParticipantQuery.data) {
    return (
      <JoinRoomPanel
        roomCode={retrospective.roomCode}
        title={retrospective.title}
        teamName={retrospective.teamName}
        isClosed={retrospective.status === 'closed'}
        onJoin={async (displayName) => {
          try {
            await joinRetrospective({ roomCode: retrospective.roomCode, displayName })
            saveDisplayName(displayName)
            await queryClient.invalidateQueries({ queryKey: ['own-participant', retrospective.id, userId] })
          } catch (err) {
            toast.error(toUserMessage(err, 'No pudimos unirte a la sala. Intentá de nuevo.'))
          }
        }}
      />
    )
  }

  if (!board.isLoaded) {
    return <BoardSkeleton />
  }

  const isCreator = retrospective.createdBy === userId

  async function handleCreate(columnType: ColumnType, values: CommentFormInput) {
    const participant = ownParticipantQuery.data
    if (!participant || !retrospective) return
    const tempId = `optimistic-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const optimisticRow: CommentRow = {
      id: tempId,
      retrospective_id: retrospective.id,
      participant_id: participant.id,
      column_type: columnType,
      content: values.content,
      assignee: values.assignee || null,
      created_at: now,
      updated_at: now,
    }
    board.addOptimisticComment(optimisticRow)
    try {
      const created = await createComment({
        retrospectiveId: retrospective.id,
        participantId: participant.id,
        columnType,
        content: values.content,
        assignee: values.assignee,
      })
      board.commitComment(created)
    } catch (err) {
      board.removeOptimisticComment(tempId)
      toast.error(toUserMessage(err, 'No pudimos guardar el comentario.'))
    }
  }

  async function handleUpdate(commentId: string, values: CommentFormInput) {
    try {
      const updated = await updateComment({
        commentId,
        content: values.content,
        assignee: values.assignee,
      })
      board.commitComment(updated)
    } catch (err) {
      toast.error(toUserMessage(err, 'No pudimos actualizar el comentario.'))
      throw err
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteComment(commentId)
      board.removeComment(commentId)
    } catch (err) {
      toast.error(toUserMessage(err, 'No pudimos eliminar el comentario.'))
      throw err
    }
  }

  function handleToggleReaction(commentId: string) {
    const comment = board.comments.find((c) => c.id === commentId)
    if (!comment) return
    board.setReactionOverride(commentId, !comment.reactedBySelf)
    toggleReaction(commentId).catch((err) => {
      board.clearReactionOverride(commentId)
      toast.error(toUserMessage(err, 'No pudimos registrar tu reacción.'))
    })
  }

  async function handleFinish() {
    if (!retrospective) return
    try {
      await closeRetrospective(retrospective.id)
      queryClient.invalidateQueries({ queryKey: ['retrospective', code] })
      toast.success('Retro finalizada')
    } catch (err) {
      toast.error(toUserMessage(err, 'No pudimos finalizar la retro.'))
    }
  }

  async function handleExportPdf() {
    if (!retrospective) return
    const { exportRetrospectiveToPdf } = await import('@/services/pdf-export')
    exportRetrospectiveToPdf(retrospective, board.comments, board.participants)
  }

  return (
    <RetrospectiveBoard
      retrospective={retrospective}
      isCreator={isCreator}
      participants={board.participants}
      commentsByColumn={board.commentsByColumn}
      connectionStatus={board.connectionStatus}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onToggleReaction={handleToggleReaction}
      onFinish={handleFinish}
      onExportPdf={handleExportPdf}
    />
  )
}

function StatusScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
        <MessagesSquare className="size-5 text-secondary-foreground" />
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button asChild className="mt-2">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="min-h-svh bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-[1400px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColumnSkeleton />
        <ColumnSkeleton />
        <ColumnSkeleton />
        <ColumnSkeleton />
      </div>
    </div>
  )
}
