import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { buildComments, mapParticipant, fetchBoardData } from '@/services/board'
import { mapRetrospective } from '@/services/retrospectives'
import type { CommentRow, ParticipantRow, ReactionRow, ColumnType, RetrospectiveRow } from '@/types/database'
import type { Comment, Participant, Retrospective } from '@/types/domain'
import { useConnectionStatus } from '@/hooks/use-connection-status'

interface State {
  participants: Map<string, ParticipantRow>
  comments: Map<string, CommentRow>
  reactions: Map<string, ReactionRow>
  optimisticComments: Map<string, CommentRow>
  reactionOverrides: Map<string, boolean>
  isLoaded: boolean
}

type Action =
  | { type: 'INITIAL_LOAD'; participants: ParticipantRow[]; comments: CommentRow[]; reactions: ReactionRow[] }
  | { type: 'UPSERT_PARTICIPANT'; row: ParticipantRow }
  | { type: 'UPSERT_COMMENT'; row: CommentRow }
  | { type: 'REMOVE_COMMENT'; id: string }
  | { type: 'UPSERT_REACTION'; row: ReactionRow }
  | { type: 'REMOVE_REACTION'; id: string }
  | { type: 'ADD_OPTIMISTIC_COMMENT'; row: CommentRow }
  | { type: 'REMOVE_OPTIMISTIC_COMMENT'; tempId: string }
  | { type: 'SET_REACTION_OVERRIDE'; commentId: string; value: boolean }
  | { type: 'CLEAR_REACTION_OVERRIDE'; commentId: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INITIAL_LOAD':
      return {
        ...state,
        participants: new Map(action.participants.map((p) => [p.id, p])),
        comments: new Map(action.comments.map((c) => [c.id, c])),
        reactions: new Map(action.reactions.map((r) => [r.id, r])),
        isLoaded: true,
      }
    case 'UPSERT_PARTICIPANT': {
      const next = new Map(state.participants)
      next.set(action.row.id, action.row)
      return { ...state, participants: next }
    }
    case 'UPSERT_COMMENT': {
      const next = new Map(state.comments)
      next.set(action.row.id, action.row)
      const nextOptimistic = new Map(state.optimisticComments)
      for (const [tempId, temp] of nextOptimistic) {
        if (
          temp.participant_id === action.row.participant_id &&
          temp.content === action.row.content &&
          temp.column_type === action.row.column_type
        ) {
          nextOptimistic.delete(tempId)
        }
      }
      return { ...state, comments: next, optimisticComments: nextOptimistic }
    }
    case 'REMOVE_COMMENT': {
      const next = new Map(state.comments)
      next.delete(action.id)
      return { ...state, comments: next }
    }
    case 'UPSERT_REACTION': {
      const next = new Map(state.reactions)
      next.set(action.row.id, action.row)
      const overrides = new Map(state.reactionOverrides)
      overrides.delete(action.row.comment_id)
      return { ...state, reactions: next, reactionOverrides: overrides }
    }
    case 'REMOVE_REACTION': {
      const next = new Map(state.reactions)
      const removed = next.get(action.id)
      next.delete(action.id)
      const overrides = new Map(state.reactionOverrides)
      if (removed) overrides.delete(removed.comment_id)
      return { ...state, reactions: next, reactionOverrides: overrides }
    }
    case 'ADD_OPTIMISTIC_COMMENT': {
      const next = new Map(state.optimisticComments)
      next.set(action.row.id, action.row)
      return { ...state, optimisticComments: next }
    }
    case 'REMOVE_OPTIMISTIC_COMMENT': {
      const next = new Map(state.optimisticComments)
      next.delete(action.tempId)
      return { ...state, optimisticComments: next }
    }
    case 'SET_REACTION_OVERRIDE': {
      const next = new Map(state.reactionOverrides)
      next.set(action.commentId, action.value)
      return { ...state, reactionOverrides: next }
    }
    case 'CLEAR_REACTION_OVERRIDE': {
      const next = new Map(state.reactionOverrides)
      next.delete(action.commentId)
      return { ...state, reactionOverrides: next }
    }
    default:
      return state
  }
}

const initialState: State = {
  participants: new Map(),
  comments: new Map(),
  reactions: new Map(),
  optimisticComments: new Map(),
  reactionOverrides: new Map(),
  isLoaded: false,
}

export function useBoard(retrospectiveId: string | null, currentUserId: string | null, enabled = true) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retrospectivePatch, setRetrospectivePatch] = useState<Retrospective | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const connectionStatus = useConnectionStatus(channel)

  useEffect(() => {
    if (!retrospectiveId || !enabled) return
    let cancelled = false

    fetchBoardData(retrospectiveId)
      .then((data) => {
        if (cancelled) return
        dispatch({ type: 'INITIAL_LOAD', ...data })
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el tablero')
      })

    return () => {
      cancelled = true
    }
  }, [retrospectiveId, enabled])

  useEffect(() => {
    if (!retrospectiveId || !enabled) return
    let cancelled = false

    const ch = supabase
      .channel(`retro-${retrospectiveId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `retrospective_id=eq.${retrospectiveId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            dispatch({ type: 'REMOVE_COMMENT', id: (payload.old as CommentRow).id })
          } else {
            dispatch({ type: 'UPSERT_COMMENT', row: payload.new as CommentRow })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions', filter: `retrospective_id=eq.${retrospectiveId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            dispatch({ type: 'REMOVE_REACTION', id: (payload.old as ReactionRow).id })
          } else {
            dispatch({ type: 'UPSERT_REACTION', row: payload.new as ReactionRow })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `retrospective_id=eq.${retrospectiveId}` },
        (payload) => {
          if (payload.eventType !== 'DELETE') {
            dispatch({ type: 'UPSERT_PARTICIPANT', row: payload.new as ParticipantRow })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'retrospectives', filter: `id=eq.${retrospectiveId}` },
        (payload) => {
          setRetrospectivePatch(mapRetrospective(payload.new as RetrospectiveRow))
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        // Re-sincroniza al (re)conectar: cubre cambios ocurridos antes de la suscripción.
        fetchBoardData(retrospectiveId)
          .then((data) => {
            if (!cancelled) dispatch({ type: 'INITIAL_LOAD', ...data })
          })
          .catch(() => {})
      })

    channelRef.current = ch
    setChannel(ch)

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
      channelRef.current = null
      setChannel(null)
    }
  }, [retrospectiveId, enabled])

  const currentParticipant = useMemo<Participant | null>(() => {
    if (!currentUserId) return null
    for (const row of state.participants.values()) {
      if (row.user_id === currentUserId) return mapParticipant(row, currentUserId)
    }
    return null
  }, [state.participants, currentUserId])

  const participants = useMemo<Participant[]>(() => {
    return Array.from(state.participants.values())
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
      .map((row) => mapParticipant(row, currentUserId))
  }, [state.participants, currentUserId])

  const comments = useMemo<Comment[]>(() => {
    const allComments = [...state.comments.values(), ...state.optimisticComments.values()]
    const built = buildComments(
      allComments,
      Array.from(state.reactions.values()),
      state.participants,
      currentParticipant?.id ?? null
    )

    return built
      .map((comment) => {
        const override = state.reactionOverrides.get(comment.id)
        if (override === undefined || !currentParticipant) return comment

        const alreadyReacted = comment.reactedByParticipantIds.includes(currentParticipant.id)
        if (override === alreadyReacted) return comment

        if (override) {
          return {
            ...comment,
            reactionCount: comment.reactionCount + 1,
            reactedByParticipantIds: [...comment.reactedByParticipantIds, currentParticipant.id],
            reactorNames: [...comment.reactorNames, currentParticipant.displayName],
            reactedBySelf: true,
          }
        }
        return {
          ...comment,
          reactionCount: Math.max(0, comment.reactionCount - 1),
          reactedByParticipantIds: comment.reactedByParticipantIds.filter(
            (id) => id !== currentParticipant.id
          ),
          reactorNames: comment.reactorNames.filter((n) => n !== currentParticipant.displayName),
          reactedBySelf: false,
        }
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [state.comments, state.optimisticComments, state.reactions, state.participants, state.reactionOverrides, currentParticipant])

  const addOptimisticComment = useCallback((row: CommentRow) => {
    dispatch({ type: 'ADD_OPTIMISTIC_COMMENT', row })
  }, [])

  const removeOptimisticComment = useCallback((tempId: string) => {
    dispatch({ type: 'REMOVE_OPTIMISTIC_COMMENT', tempId })
  }, [])

  const commitComment = useCallback((row: CommentRow) => {
    dispatch({ type: 'UPSERT_COMMENT', row })
  }, [])

  const removeComment = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_COMMENT', id })
  }, [])

  const setReactionOverride = useCallback((commentId: string, value: boolean) => {
    dispatch({ type: 'SET_REACTION_OVERRIDE', commentId, value })
  }, [])

  const clearReactionOverride = useCallback((commentId: string) => {
    dispatch({ type: 'CLEAR_REACTION_OVERRIDE', commentId })
  }, [])

  const commentsByColumn = useMemo(() => {
    const map: Record<ColumnType, Comment[]> = { good: [], okay: [], fix: [], action: [] }
    for (const comment of comments) {
      map[comment.columnType].push(comment)
    }
    return map
  }, [comments])

  return {
    isLoaded: state.isLoaded,
    loadError,
    connectionStatus,
    retrospectivePatch,
    participants,
    currentParticipant,
    comments,
    commentsByColumn,
    addOptimisticComment,
    removeOptimisticComment,
    commitComment,
    removeComment,
    setReactionOverride,
    clearReactionOverride,
  }
}
