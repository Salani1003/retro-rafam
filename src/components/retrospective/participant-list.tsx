import { Users } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Participant } from '@/types/domain'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function ParticipantList({ participants }: { participants: Participant[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted">
          <Users className="size-3.5 text-muted-foreground" />
          {participants.length} {participants.length === 1 ? 'participante' : 'participantes'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Participantes</p>
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                {initials(p.displayName)}
              </span>
              <span className="truncate">{p.displayName}</span>
              {p.isSelf && <span className="ml-auto text-xs text-muted-foreground">Vos</span>}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
