export type RetrospectiveStatus = 'active' | 'closed'

export type ColumnType = 'good' | 'okay' | 'fix' | 'action'

export const COLUMN_TYPES: ColumnType[] = ['good', 'okay', 'fix', 'action']

export type RetrospectiveRow = {
  id: string
  title: string | null
  team_name: string | null
  room_code: string
  created_by: string
  status: RetrospectiveStatus
  created_at: string
  closed_at: string | null
}

export type ParticipantRow = {
  id: string
  retrospective_id: string
  user_id: string
  display_name: string
  joined_at: string
}

export type CommentRow = {
  id: string
  retrospective_id: string
  participant_id: string
  column_type: ColumnType
  content: string
  assignee: string | null
  created_at: string
  updated_at: string
}

export type ReactionRow = {
  id: string
  comment_id: string
  retrospective_id: string
  participant_id: string
  reaction_type: 'thumbs_up'
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      retrospectives: {
        Row: RetrospectiveRow
        Insert: Partial<RetrospectiveRow> & {
          created_by: string
          room_code: string
        }
        Update: Partial<RetrospectiveRow>
        Relationships: []
      }
      participants: {
        Row: ParticipantRow
        Insert: Partial<ParticipantRow> & {
          retrospective_id: string
          user_id: string
          display_name: string
        }
        Update: Partial<ParticipantRow>
        Relationships: []
      }
      comments: {
        Row: CommentRow
        Insert: Partial<CommentRow> & {
          retrospective_id: string
          participant_id: string
          column_type: ColumnType
          content: string
        }
        Update: Partial<CommentRow>
        Relationships: []
      }
      reactions: {
        Row: ReactionRow
        Insert: Partial<ReactionRow> & {
          comment_id: string
          retrospective_id: string
          participant_id: string
        }
        Update: Partial<ReactionRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_retrospective: {
        Args: { p_display_name: string; p_title: string | null; p_team_name: string | null }
        Returns: RetrospectiveRow
      }
      join_retrospective: {
        Args: { p_room_code: string; p_display_name: string }
        Returns: RetrospectiveRow
      }
      close_retrospective: {
        Args: { p_retrospective_id: string }
        Returns: RetrospectiveRow
      }
      delete_retrospective: {
        Args: { p_retrospective_id: string }
        Returns: undefined
      }
      toggle_reaction: {
        Args: { p_comment_id: string }
        Returns: boolean
      }
      is_participant: {
        Args: { p_retrospective_id: string }
        Returns: boolean
      }
      generate_room_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}
