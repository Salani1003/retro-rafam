import { Smile, Meh, Wrench, Rocket, type LucideIcon } from 'lucide-react'
import type { ColumnType } from '@/types/database'

export const COLUMN_ICONS: Record<ColumnType, LucideIcon> = {
  good: Smile,
  okay: Meh,
  fix: Wrench,
  action: Rocket,
}
