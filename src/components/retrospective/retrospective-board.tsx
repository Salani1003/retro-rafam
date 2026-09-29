import { useState } from 'react'
import { Copy, Check, Download, MessagesSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConnectionIndicator } from '@/components/retrospective/connection-indicator'
import { ParticipantList } from '@/components/retrospective/participant-list'
import { RetrospectiveColumn } from '@/components/retrospective/retrospective-column'
import { FinishRetrospectiveDialog } from '@/components/retrospective/finish-retrospective-dialog'
import { COLUMN_ORDER } from '@/types/domain'
import type { Comment, ConnectionStatus, Participant, Retrospective } from '@/types/domain'
import type { ColumnType } from '@/types/database'
import type { CommentFormInput } from '@/schemas'

interface RetrospectiveBoardProps {
  retrospective: Retrospective
  isCreator: boolean
  participants: Participant[]
  commentsByColumn: Record<ColumnType, Comment[]>
  connectionStatus: ConnectionStatus
  onCreate: (columnType: ColumnType, values: CommentFormInput) => Promise<void>
  onUpdate: (commentId: string, values: CommentFormInput) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onToggleReaction: (commentId: string) => void
  onFinish: () => Promise<void>
  onExportPdf: () => void
}

export function RetrospectiveBoard({
  retrospective,
  isCreator,
  participants,
  commentsByColumn,
  connectionStatus,
  onCreate,
  onUpdate,
  onDelete,
  onToggleReaction,
  onFinish,
  onExportPdf,
}: RetrospectiveBoardProps) {
  const [copied, setCopied] = useState(false)
  const isActive = retrospective.status === 'active'

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Enlace copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No pudimos copiar el enlace. Copialo manualmente desde la barra de direcciones.')
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-md"
                style={{ background: 'var(--primary)' }}
              >
                <MessagesSquare className="size-4" style={{ color: 'var(--primary-foreground)' }} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold sm:text-base">
                  {retrospective.title || 'Retrospectiva de equipo'}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {retrospective.teamName ?? 'Sin equipo asignado'}
                  {' · '}
                  <span className="font-[var(--font-mono)] tracking-wide">{retrospective.roomCode}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ConnectionIndicator status={connectionStatus} />
              <ParticipantList participants={participants} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>

            {retrospective.status === 'closed' ? (
              <Button size="sm" onClick={onExportPdf} className="gap-1.5">
                <Download className="size-3.5" />
                Descargar retrospectiva
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" disabled className="gap-1.5">
                      <Download className="size-3.5" />
                      Descargar retrospectiva
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Se habilita cuando finaliza la retrospectiva</TooltipContent>
              </Tooltip>
            )}

            {isCreator && isActive && (
              <div className="ml-auto">
                <FinishRetrospectiveDialog onConfirm={onFinish} />
              </div>
            )}
          </div>

          {!isActive && (
            <div className="rounded-[var(--radius-sm)] bg-muted px-3 py-2 text-xs text-muted-foreground">
              Esta retrospectiva finalizó
              {retrospective.closedAt
                ? ` el ${new Date(retrospective.closedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : ''}
              . El tablero queda disponible en modo lectura.
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
        <div className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-3 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 lg:gap-4">
          {COLUMN_ORDER.map((columnType) => (
            <div key={columnType} className="w-[86vw] shrink-0 snap-center sm:w-auto sm:shrink">
              <RetrospectiveColumn
                columnType={columnType}
                comments={commentsByColumn[columnType]}
                isBoardActive={isActive}
                onCreate={onCreate}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleReaction={onToggleReaction}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
