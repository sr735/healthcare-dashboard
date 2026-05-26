import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientsApi, type GetPatientsParams } from '@/api/patients'
import type { Patient, PatientCreate, PatientReplace, PatientUpdate, PaginatedResponse } from '@/types'

export const PATIENTS_QUERY_KEY = 'patients' as const

/**
 * How long cached patient data is considered fresh.
 * During this window, a component mounting will read from the cache
 * without firing a network request.
 */
const PATIENT_STALE_TIME = 30_000 // 30 s

export function usePatients(params: GetPatientsParams = {}) {
  return useQuery({
    queryKey: [PATIENTS_QUERY_KEY, params],
    queryFn: () => patientsApi.getAll(params),
    placeholderData: (prev) => prev, // keeps previous page visible while next loads
    staleTime: PATIENT_STALE_TIME,
  })
}

export function usePatient(id: string) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: [PATIENTS_QUERY_KEY, id],
    queryFn: () => patientsApi.getById(id),
    enabled: Boolean(id),
    staleTime: PATIENT_STALE_TIME,

    // Seed from any list page already in cache — avoids the loading skeleton
    // when navigating from the patients list to a detail page.
    initialData: () => {
      const cachedPages = queryClient.getQueriesData<PaginatedResponse<Patient>>({
        queryKey: [PATIENTS_QUERY_KEY],
      })
      for (const [, page] of cachedPages) {
        if (!page) continue
        const match = page.items.find((p) => p.id === id)
        if (match) return match
      }
      return undefined
    },
    // Mark the seeded data as stale immediately so a background refetch fires
    // and we always show the most up-to-date record.
    initialDataUpdatedAt: () =>
      queryClient.getQueryState([PATIENTS_QUERY_KEY])?.dataUpdatedAt,
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PatientCreate) => patientsApi.create(payload),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] }) },
  })
}

export function useReplacePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatientReplace }) =>
      patientsApi.replace(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData([PATIENTS_QUERY_KEY, updated.id], updated)
      void queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] })
    },
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatientUpdate }) =>
      patientsApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData([PATIENTS_QUERY_KEY, updated.id], updated)
      void queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] })
    },
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => patientsApi.delete(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] }) },
  })
}
