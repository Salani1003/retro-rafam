import { supabase } from '@/lib/supabase'
import type { ColumnType, CommentRow } from '@/types/database'

export async function createComment(input: {
  retrospectiveId: string
  participantId: string
  columnType: ColumnType
  content: string
  assignee?: string | null
}): Promise<CommentRow> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      retrospective_id: input.retrospectiveId,
      participant_id: input.participantId,
      column_type: input.columnType,
      content: input.content,
      assignee: input.assignee?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateComment(input: {
  commentId: string
  content: string
  assignee?: string | null
}): Promise<CommentRow> {
  const { data, error } = await supabase
    .from('comments')
    .update({ content: input.content, assignee: input.assignee?.trim() || null })
    .eq('id', input.commentId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw error
}
