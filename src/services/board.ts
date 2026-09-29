import { supabase } from '@/lib/supabase'
import type { CommentRow, ParticipantRow, ReactionRow } from '@/types/database'
import type { Comment, Participant } from '@/types/domain'

export function mapParticipant(row: ParticipantRow, currentUserId: string | null): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    joinedAt: row.joined_at,
    isSelf: row.user_id === currentUserId,
  }
}

export function buildComments(
  commentRows: CommentRow[],
  reactionRows: ReactionRow[],
  participantsById: Map<string, ParticipantRow>,
  currentParticipantId: string | null
): Comment[] {
  const reactionsByComment = new Map<string, ReactionRow[]>()
  for (const reaction of reactionRows) {
    const list = reactionsByComment.get(reaction.comment_id) ?? []
    list.push(reaction)
    reactionsByComment.set(reaction.comment_id, list)
  }

  return commentRows.map((row) => {
    const reactions = reactionsByComment.get(row.id) ?? []
    const author = participantsById.get(row.participant_id)
    return {
      id: row.id,
      retrospectiveId: row.retrospective_id,
      participantId: row.participant_id,
      columnType: row.column_type,
      content: row.content,
      assignee: row.assignee,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: author?.display_name ?? 'Participante',
      reactionCount: reactions.length,
      reactedByParticipantIds: reactions.map((r) => r.participant_id),
      reactorNames: reactions.map(
        (r) => participantsById.get(r.participant_id)?.display_name ?? 'Alguien'
      ),
      reactedBySelf: currentParticipantId
        ? reactions.some((r) => r.participant_id === currentParticipantId)
        : false,
      isOwn: row.participant_id === currentParticipantId,
    }
  })
}

export interface BoardData {
  participants: ParticipantRow[]
  comments: CommentRow[]
  reactions: ReactionRow[]
}

export async function fetchBoardData(retrospectiveId: string): Promise<BoardData> {
  const [participantsRes, commentsRes, reactionsRes] = await Promise.all([
    supabase
      .from('participants')
      .select('*')
      .eq('retrospective_id', retrospectiveId)
      .order('joined_at', { ascending: true }),
    supabase
      .from('comments')
      .select('*')
      .eq('retrospective_id', retrospectiveId)
      .order('created_at', { ascending: true }),
    supabase.from('reactions').select('*').eq('retrospective_id', retrospectiveId),
  ])

  if (participantsRes.error) throw participantsRes.error
  if (commentsRes.error) throw commentsRes.error
  if (reactionsRes.error) throw reactionsRes.error

  return {
    participants: participantsRes.data ?? [],
    comments: commentsRes.data ?? [],
    reactions: reactionsRes.data ?? [],
  }
}
