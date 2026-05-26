import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { PaletteMode } from '@mui/material'
import type { PatientFilters, SortConfig } from '@/types'

interface UiState {
  // Theme
  themeMode: PaletteMode
  toggleTheme: () => void

  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void

  // Patient list filters
  patientFilters: PatientFilters
  setPatientFilters: (filters: Partial<PatientFilters>) => void
  resetPatientFilters: () => void

  // Patient list sort
  patientSort: SortConfig
  setPatientSort: (sort: SortConfig) => void

  // Patient list pagination
  patientPage: number
  patientPageSize: number
  setPatientPage: (page: number) => void
  setPatientPageSize: (size: number) => void

  // Snackbar / toast
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }
  showSnackbar: (message: string, severity?: 'success' | 'error' | 'info' | 'warning') => void
  hideSnackbar: () => void
}

const defaultFilters: PatientFilters = {
  search: '',
  status: '',
  gender: '',
  physician: '',
}

const defaultSort: SortConfig = {
  field: 'last_name',
  direction: 'asc',
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      // Persist theme preference across sessions
      themeMode: (localStorage.getItem('healthdash-theme') as PaletteMode | null) ?? 'light',
      toggleTheme: () =>
        set((s) => {
          const next: PaletteMode = s.themeMode === 'light' ? 'dark' : 'light'
          localStorage.setItem('healthdash-theme', next)
          return { themeMode: next }
        }),

      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      patientFilters: defaultFilters,
      setPatientFilters: (filters) =>
        set((s) => ({
          patientFilters: { ...s.patientFilters, ...filters },
          patientPage: 1, // reset to page 1 on filter change
        })),
      resetPatientFilters: () => set({ patientFilters: defaultFilters, patientPage: 1 }),

      patientSort: defaultSort,
      setPatientSort: (sort) => set({ patientSort: sort }),

      patientPage: 1,
      patientPageSize: 20,
      setPatientPage: (page) => set({ patientPage: page }),
      setPatientPageSize: (size) => set({ patientPageSize: size, patientPage: 1 }),

      snackbar: { open: false, message: '', severity: 'info' },
      showSnackbar: (message, severity = 'info') =>
        set({ snackbar: { open: true, message, severity } }),
      hideSnackbar: () => set((s) => ({ snackbar: { ...s.snackbar, open: false } })),
    }),
    { name: 'ui-store' },
  ),
)
