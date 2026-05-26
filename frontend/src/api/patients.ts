import type {
  Patient,
  PatientCreate,
  PatientReplace,
  PatientUpdate,
  PaginatedResponse,
  PatientFilters,
  SortConfig,
} from '@/types'
import { apiClient } from '@/lib/axios'

export interface GetPatientsParams {
  page?: number
  page_size?: number
  filters?: Partial<PatientFilters>
  sort?: SortConfig
}

export const patientsApi = {
  getAll: async ({
    page = 1,
    page_size = 20,
    filters,
    sort,
  }: GetPatientsParams = {}): Promise<PaginatedResponse<Patient>> => {
    const params: Record<string, string | number> = { page, page_size }
    if (filters?.search) params['search'] = filters.search
    if (filters?.status) params['status'] = filters.status
    if (filters?.gender) params['gender'] = filters.gender
    if (filters?.physician) params['physician'] = filters.physician
    if (sort?.field) params['sort_by'] = sort.field
    if (sort?.direction) params['sort_dir'] = sort.direction
    const { data } = await apiClient.get<PaginatedResponse<Patient>>('/patients', { params })
    return data
  },

  getById: async (id: string): Promise<Patient> => {
    const { data } = await apiClient.get<Patient>(`/patients/${id}`)
    return data
  },

  create: async (payload: PatientCreate): Promise<Patient> => {
    const { data } = await apiClient.post<Patient>('/patients', payload)
    return data
  },

  replace: async (id: string, payload: PatientReplace): Promise<Patient> => {
    const { data } = await apiClient.put<Patient>(`/patients/${id}`, payload)
    return data
  },

  update: async (id: string, payload: PatientUpdate): Promise<Patient> => {
    const { data } = await apiClient.patch<Patient>(`/patients/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/patients/${id}`)
  },
}
