export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type PatientStatus = 'active' | 'inactive' | 'critical' | 'discharged'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: Gender
  blood_type: BloodType | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  status: PatientStatus
  primary_physician: string | null
  insurance_provider: string | null
  insurance_id: string | null
  allergies: string[]
  medical_notes: string | null
  last_visit_date: string | null
  created_at: string
  updated_at: string
}

export interface PatientCreate {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: Gender
  blood_type?: BloodType | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  status?: PatientStatus
  primary_physician?: string | null
  insurance_provider?: string | null
  insurance_id?: string | null
  allergies?: string[]
  medical_notes?: string | null
  last_visit_date?: string | null
}

export type PatientReplace = PatientCreate
export type PatientUpdate = Partial<PatientCreate>

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiError {
  detail: string
  status_code?: number
}

export interface PatientFilters {
  search: string
  status: PatientStatus | ''
  gender: Gender | ''
  physician: string
}

export interface PatientNote {
  id: string
  patient_id: string
  content: string
  author: string | null
  created_at: string
  note_type: 'clinical' | 'medical_background'
}

export interface NoteCreate {
  content: string
  author?: string | null
  created_at?: string | null
}

export interface NoteListResponse {
  items: PatientNote[]
  total: number
}

export interface PatientSummary {
  patient_id: string
  full_name: string
  summary: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: keyof Patient
  direction: SortDirection
}
