import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, Download, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConnectionIndicator } from '@/components/retrospective/connection-indicator'
import { ThemeToggle } from '@/components/theme-toggle'
import { ParticipantList } from '@/components/retrospective/participant-list'
import { COLUMN_ICONS } from '@/components/retrospective/column-icons'
import { RetrospectiveColumn } from '@/components/retrospective/retrospective-column'
import { FinishRetrospectiveDialog } from '@/components/retrospective/finish-retrospective-dialog'
import { cn } from '@/lib/utils'
import { COLUMN_CONFIG, COLUMN_ORDER } from '@/types/domain'
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
  const [activeColumn, setActiveColumn] = useState<ColumnType>(COLUMN_ORDER[0])
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
              <Link to="/" aria-label="Volver al inicio" className="shrink-0">
                <img src="/logo-flecha.png" alt="" className="h-8 w-auto dark:brightness-0 dark:invert" />
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold sm:text-base">
                  {retrospective.title || 'Retro de equipo'}
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
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/">
                <LogOut className="size-3.5" />
                Salir
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1.5">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>

            {retrospective.status === 'closed' ? (
              <Button size="sm" onClick={onExportPdf} className="gap-1.5">
                <Download className="size-3.5" />
                Descargar retro
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" disabled className="gap-1.5">
                      <Download className="size-3.5" />
                      Descargar retro
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Se habilita cuando finaliza la retro</TooltipContent>
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
              Esta retro finalizó
              {retrospective.closedAt
                ? ` el ${new Date(retrospective.closedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : ''}
              . El tablero queda disponible en modo lectura.
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
        <Tabs
          value={activeColumn}
          onValueChange={(value) => setActiveColumn(value as ColumnType)}
          className="mb-3 sm:hidden"
        >
          <TabsList className="grid h-auto w-full grid-cols-4">
            {COLUMN_ORDER.map((columnType) => {
              const Icon = COLUMN_ICONS[columnType]
              const config = COLUMN_CONFIG[columnType]
              return (
                <TabsTrigger
                  key={columnType}
                  value={columnType}
                  aria-label={config.title}
                  className="flex-col gap-0.5 py-1.5"
                >
                  <Icon className="size-4" style={{ color: config.colorVar }} />
                  <span className="text-xs font-semibold tabular-nums">
                    {commentsByColumn[columnType].length}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {COLUMN_ORDER.map((columnType) => (
            <div
              key={columnType}
              className={cn(columnType === activeColumn ? 'block' : 'hidden', 'sm:block')}
            >
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
