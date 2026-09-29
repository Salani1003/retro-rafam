import { supabase } from '@/lib/supabase'

/** Devuelve true si quedó reaccionado, false si se retiró la reacción. */
export async function toggleReaction(commentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_reaction', { p_comment_id: commentId })
  if (error) throw error
  return Boolean(data)
}
