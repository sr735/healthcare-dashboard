import { apiClient as api } from '@/lib/axios'
import type { NoteCreate, NoteListResponse, PatientNote, PatientSummary } from '@/types'

export async function fetchNotes(patientId: string): Promise<NoteListResponse> {
  const { data } = await api.get<NoteListResponse>(`/patients/${patientId}/notes`)
  return data
}

export async function createNote(patientId: string, payload: NoteCreate): Promise<PatientNote> {
  const { data } = await api.post<PatientNote>(`/patients/${patientId}/notes`, payload)
  return data
}

export async function deleteNote(patientId: string, noteId: string): Promise<void> {
  await api.delete(`/patients/${patientId}/notes/${noteId}`)
}

export async function fetchSummary(patientId: string): Promise<PatientSummary> {
  const { data } = await api.get<PatientSummary>(`/patients/${patientId}/summary`)
  return data
}
