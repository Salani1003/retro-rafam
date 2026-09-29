import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommentForm } from '@/components/retrospective/comment-form'
import { CommentCard } from '@/components/retrospective/comment-card'
import { COLUMN_ICONS } from '@/components/retrospective/column-icons'
import { ColumnEmptyState } from '@/components/retrospective/empty-state'
import { COLUMN_CONFIG } from '@/types/domain'
import type { Comment } from '@/types/domain'
import type { ColumnType } from '@/types/database'
import type { CommentFormInput } from '@/schemas'

interface RetrospectiveColumnProps {
  columnType: ColumnType
  comments: Comment[]
  isBoardActive: boolean
  onCreate: (columnType: ColumnType, values: CommentFormInput) => Promise<void>
  onUpdate: (commentId: string, values: CommentFormInput) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onToggleReaction: (commentId: string) => void
}

export function RetrospectiveColumn({
  columnType,
  comments,
  isBoardActive,
  onCreate,
  onUpdate,
  onDelete,
  onToggleReaction,
}: RetrospectiveColumnProps) {
  const [isAdding, setIsAdding] = useState(false)
  const config = COLUMN_CONFIG[columnType]
  const Icon = COLUMN_ICONS[columnType]

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card/40 p-3">
      <div
        className="flex items-start gap-2 rounded-[var(--radius-sm)] px-2.5 py-2"
        style={{ background: config.bgVar }}
      >
        <Icon className="mt-0.5 size-4 shrink-0" style={{ color: config.colorVar }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: config.colorVar }}>
            {config.title}
          </p>
          <p className="min-h-8 text-xs opacity-80" style={{ color: config.colorVar }}>
            {config.description}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums"
          style={{ color: config.colorVar }}
        >
          {comments.length}
        </span>
      </div>

      {isBoardActive && !isAdding && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="justify-start gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Agregar comentario
        </Button>
      )}

      {isAdding && (
        <CommentForm
          columnType={columnType}
          accentColor={config.colorVar}
          onCancel={() => setIsAdding(false)}
          onSubmit={async (values) => {
            await onCreate(columnType, values)
            setIsAdding(false)
          }}
        />
      )}

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        {comments.length === 0 && !isAdding && <ColumnEmptyState accentColor={config.colorVar} />}
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            accentColor={config.colorVar}
            showReactions={config.showReactions}
            showAssignee={columnType === 'action'}
            isBoardActive={isBoardActive}
            onToggleReaction={() => onToggleReaction(comment.id)}
            onUpdate={(values) => onUpdate(comment.id, values)}
            onDelete={() => onDelete(comment.id)}
          />
        ))}
      </div>
    </div>
  )
}
