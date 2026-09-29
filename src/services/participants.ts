import { supabase } from '@/lib/supabase'
import type { ParticipantRow } from '@/types/database'

export async function findOwnParticipant(
  retrospectiveId: string,
  userId: string
): Promise<ParticipantRow | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('retrospective_id', retrospectiveId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}
