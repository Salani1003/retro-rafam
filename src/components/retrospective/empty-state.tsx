import { MessageSquarePlus } from 'lucide-react'

export function ColumnEmptyState({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border px-4 py-8 text-center">
      <MessageSquarePlus className="size-5" style={{ color: accentColor }} />
      <p className="text-xs text-muted-foreground">Todavía no hay tarjetas acá.</p>
    </div>
  )
}
