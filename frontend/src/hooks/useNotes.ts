import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNotes, createNote, deleteNote, fetchSummary } from '@/api/notes'
import type { NoteCreate } from '@/types'

// Named constants prevent magic-string bugs and make cache invalidation explicit.
export const NOTES_QUERY_KEY = 'notes' as const
export const SUMMARY_QUERY_KEY = 'summary' as const

/**
 * Notes and summaries are derived from patient data that changes infrequently.
 * A 30-second stale window avoids redundant fetches when switching tabs.
 */
const NOTES_STALE_TIME = 30_000 // 30 s

export function useNotes(patientId: string) {
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, patientId],
    queryFn: () => fetchNotes(patientId),
    enabled: !!patientId,
    staleTime: NOTES_STALE_TIME,
  })
}

export function useCreateNote(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NoteCreate) => createNote(patientId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, patientId] })
      void queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, patientId] })
    },
  })
}

export function useDeleteNote(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(patientId, noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, patientId] })
      void queryClient.invalidateQueries({ queryKey: [SUMMARY_QUERY_KEY, patientId] })
    },
  })
}

export function usePatientSummary(patientId: string) {
  return useQuery({
    queryKey: [SUMMARY_QUERY_KEY, patientId],
    queryFn: () => fetchSummary(patientId),
    enabled: !!patientId,
    staleTime: NOTES_STALE_TIME,
  })
}
