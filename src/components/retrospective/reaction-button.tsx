import { useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ReactionButtonProps {
  count: number
  reactedBySelf: boolean
  reactorNames: string[]
  disabled?: boolean
  onToggle: () => void
}

export function ReactionButton({
  count,
  reactedBySelf,
  reactorNames,
  disabled,
  onToggle,
}: ReactionButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  function handleClick() {
    if (disabled) return
    setIsAnimating(true)
    onToggle()
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        onAnimationEnd={() => setIsAnimating(false)}
        aria-pressed={reactedBySelf}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          reactedBySelf
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <ThumbsUp className={cn('size-3.5', isAnimating && 'animate-[pop_0.32s_ease]')} />
        {count > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <span
                onClick={(e) => e.stopPropagation()}
                className="tabular-nums underline decoration-dotted underline-offset-2"
              >
                {count}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-2">
              <p className="px-1 py-0.5 text-xs font-medium text-muted-foreground">
                Reaccionaron
              </p>
              <ul className="flex flex-col gap-0.5">
                {reactorNames.map((name, i) => (
                  <li key={`${name}-${i}`} className="truncate px-1 py-0.5 text-sm">
                    {name}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
        {count === 0 && <span className="tabular-nums">{count}</span>}
      </button>
    </div>
  )
}
