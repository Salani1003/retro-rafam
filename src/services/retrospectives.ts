import { supabase } from '@/lib/supabase'
import type { RetrospectiveRow } from '@/types/database'
import type { Retrospective } from '@/types/domain'

export function mapRetrospective(row: RetrospectiveRow): Retrospective {
  return {
    id: row.id,
    title: row.title,
    teamName: row.team_name,
    roomCode: row.room_code,
    createdBy: row.created_by,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  }
}

export async function createRetrospective(input: {
  displayName: string
  title?: string
  teamName?: string
}): Promise<Retrospective> {
  const { data, error } = await supabase
    .rpc('create_retrospective', {
      p_display_name: input.displayName,
      p_title: input.title ?? null,
      p_team_name: input.teamName ?? null,
    })
    .single()

  if (error) throw error
  return mapRetrospective(data as RetrospectiveRow)
}

export async function joinRetrospective(input: {
  roomCode: string
  displayName: string
}): Promise<Retrospective> {
  const { data, error } = await supabase
    .rpc('join_retrospective', {
      p_room_code: input.roomCode,
      p_display_name: input.displayName,
    })
    .single()

  if (error) throw error
  return mapRetrospective(data as RetrospectiveRow)
}

export async function getRetrospectiveByCode(roomCode: string): Promise<Retrospective | null> {
  const { data, error } = await supabase
    .from('retrospectives')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .maybeSingle()

  if (error) throw error
  return data ? mapRetrospective(data) : null
}

export async function closeRetrospective(retrospectiveId: string): Promise<Retrospective> {
  const { data, error } = await supabase
    .rpc('close_retrospective', { p_retrospective_id: retrospectiveId })
    .single()

  if (error) throw error
  return mapRetrospective(data as RetrospectiveRow)
}
