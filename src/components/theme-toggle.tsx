import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex items-center gap-1.5">
      <Sun
        className={cn('size-4 transition-colors', isDark ? 'text-muted-foreground' : 'text-foreground')}
      />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        aria-label="Activar modo oscuro"
      />
      <Moon
        className={cn('size-4 transition-colors', isDark ? 'text-foreground' : 'text-muted-foreground')}
      />
    </div>
  )
}
