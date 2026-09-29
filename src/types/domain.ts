import type { ColumnType } from '@/types/database'

export interface ColumnConfig {
  type: ColumnType
  title: string
  description: string
  colorVar: string
  bgVar: string
  showReactions: boolean
}

export const COLUMN_CONFIG: Record<ColumnType, ColumnConfig> = {
  good: {
    type: 'good',
    title: 'Cosas buenas',
    description: '¿Qué salió bien durante este sprint?',
    colorVar: 'var(--column-good)',
    bgVar: 'var(--column-good-bg)',
    showReactions: true,
  },
  okay: {
    type: 'okay',
    title: 'Cosas más o menos',
    description: '¿Qué situaciones podrían haber sido mejores?',
    colorVar: 'var(--column-okay)',
    bgVar: 'var(--column-okay-bg)',
    showReactions: true,
  },
  fix: {
    type: 'fix',
    title: 'Cosas a corregir',
    description: '¿Qué problemas debemos resolver?',
    colorVar: 'var(--column-fix)',
    bgVar: 'var(--column-fix-bg)',
    showReactions: true,
  },
  action: {
    type: 'action',
    title: 'Acciones',
    description: '¿Qué acciones concretas vamos a implementar?',
    colorVar: 'var(--column-action)',
    bgVar: 'var(--column-action-bg)',
    showReactions: false,
  },
}

export const COLUMN_ORDER: ColumnType[] = ['good', 'okay', 'fix', 'action']

export interface Comment {
  id: string
  retrospectiveId: string
  participantId: string
  columnType: ColumnType
  content: string
  assignee: string | null
  createdAt: string
  updatedAt: string
  authorName: string
  reactionCount: number
  reactedByParticipantIds: string[]
  reactorNames: string[]
  reactedBySelf: boolean
  isOwn: boolean
}

export interface Participant {
  id: string
  userId: string
  displayName: string
  joinedAt: string
  isSelf: boolean
}

export interface Retrospective {
  id: string
  title: string | null
  teamName: string | null
  roomCode: string
  createdBy: string
  status: 'active' | 'closed'
  createdAt: string
  closedAt: string | null
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'
