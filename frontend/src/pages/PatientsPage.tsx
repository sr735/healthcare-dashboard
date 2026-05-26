import { useState, useCallback, useMemo } from 'react'
import {
  Box, Typography, TextField, InputAdornment, Button, Stack, Chip,
  MenuItem, Select, FormControl, InputLabel, Tooltip, IconButton,
  useMediaQuery, useTheme, Alert,
} from '@mui/material'
import {
  DataGrid, type GridColDef, type GridSortModel, type GridPaginationModel,
} from '@mui/x-data-grid'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FilterListOffIcon from '@mui/icons-material/FilterListOff'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '@/hooks/usePatients'
import { useDebounce } from '@/hooks/useDebounce'
import { useUiStore } from '@/store/uiStore'
import PatientStatusChip from '@/components/patients/PatientStatusChip'
import PatientFormDialog from '@/components/patients/PatientFormDialog'
import { calcAge, formatDate } from '@/lib/utils'
import type { Patient, PatientStatus, Gender } from '@/types'

const STATUS_OPTIONS: { value: PatientStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'critical', label: 'Critical' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discharged', label: 'Discharged' },
]

const GENDER_OPTIONS: { value: Gender | ''; label: string }[] = [
  { value: '', label: 'All genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export default function PatientsPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))

  const {
    patientFilters, setPatientFilters, resetPatientFilters,
    patientSort, setPatientSort,
    patientPage, patientPageSize,
    setPatientPage, setPatientPageSize,
  } = useUiStore()

  // Local search / physician input — debounced before hitting the API
  const [searchInput, setSearchInput] = useState(patientFilters.search)
  const debouncedSearch = useDebounce(searchInput, 300)

  const [physicianInput, setPhysicianInput] = useState(patientFilters.physician)
  const debouncedPhysician = useDebounce(physicianInput, 300)

  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, error } = usePatients({
    page: patientPage,
    page_size: patientPageSize,
    filters: { ...patientFilters, search: debouncedSearch, physician: debouncedPhysician },
    sort: patientSort,
  })

  const patients = data?.items ?? []
  const totalRows = data?.total ?? 0

  // ── Grid columns ─────────────────────────────────────────────────────────
  // Wrapped in useMemo so the column definitions (and their renderCell closures)
  // are only recreated when navigate changes — not on every filter/page update.

  const columns = useMemo<GridColDef<Patient>[]>(() => [
    {
      field: 'last_name',
      headerName: 'Name',
      flex: 1.5,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {row.last_name}, {row.first_name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'date_of_birth',
      headerName: 'Age',
      width: 70,
      renderCell: ({ row }) => calcAge(row.date_of_birth),
    },
    {
      field: 'gender',
      headerName: 'Gender',
      width: 110,
      renderCell: ({ row }) =>
        row.gender === 'prefer_not_to_say' ? 'Undisclosed' :
        row.gender.charAt(0).toUpperCase() + row.gender.slice(1),
      hideable: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: ({ row }) => <PatientStatusChip status={row.status} />,
    },
    {
      field: 'primary_physician',
      headerName: 'Physician',
      flex: 1,
      minWidth: 140,
      renderCell: ({ row }) => row.primary_physician ?? '—',
    },
    {
      field: 'last_visit_date',
      headerName: 'Last Visit',
      width: 120,
      renderCell: ({ row }) => formatDate(row.last_visit_date),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Tooltip title="View patient">
          <IconButton
            size="small"
            onClick={() => navigate(`/patients/${row.id}`)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [navigate])

  // Memoized separately — depends on breakpoints, not navigate.
  const columnVisibilityModel = useMemo(() => ({
    gender: !isSmall,
    primary_physician: !isMobile,
  }), [isSmall, isMobile])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSortChange = useCallback(
    (model: GridSortModel) => {
      if (model.length > 0 && model[0]) {
        setPatientSort({
          field: model[0].field as keyof Patient,
          direction: model[0].sort ?? 'asc',
        })
      }
    },
    [setPatientSort],
  )

  const handlePaginationChange = useCallback(
    (model: GridPaginationModel) => {
      setPatientPage(model.page + 1) // MUI DataGrid is 0-indexed
      setPatientPageSize(model.pageSize)
    },
    [setPatientPage, setPatientPageSize],
  )

  const hasActiveFilters =
    debouncedSearch || patientFilters.status || patientFilters.gender || debouncedPhysician

  return (
    <Box>
      {/* ── Page header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Patients</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalRows} patient{totalRows !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Add Patient
        </Button>
      </Stack>

      {/* ── Filters bar ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        mb={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
      >
        <TextField
          placeholder="Search by name, email, or phone…"
          size="small"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            setPatientFilters({ search: e.target.value })
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 260, flexGrow: 1 }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={patientFilters.status}
            onChange={(e) => setPatientFilters({ status: e.target.value as PatientStatus | '' })}
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Gender</InputLabel>
          <Select
            label="Gender"
            value={patientFilters.gender}
            onChange={(e) => setPatientFilters({ gender: e.target.value as Gender | '' })}
          >
            {GENDER_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          placeholder="Filter by physician…"
          size="small"
          value={physicianInput}
          onChange={(e) => {
            setPhysicianInput(e.target.value)
            setPatientFilters({ physician: e.target.value })
          }}
          sx={{ minWidth: 200 }}
        />

        {hasActiveFilters && (
          <Chip
            label="Clear filters"
            icon={<FilterListOffIcon />}
            onClick={() => { resetPatientFilters(); setSearchInput(''); setPhysicianInput('') }}
            onDelete={() => { resetPatientFilters(); setSearchInput(''); setPhysicianInput('') }}
            variant="outlined"
            color="default"
            sx={{ alignSelf: 'center' }}
          />
        )}
      </Stack>

      {/* ── Error state ── */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load patients: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      )}

      {/* ── Data Grid ── */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={patients}
          columns={columns}
          getRowId={(row) => row.id}
          rowCount={totalRows}
          loading={isLoading}
          paginationMode="server"
          sortingMode="server"
          paginationModel={{ page: patientPage - 1, pageSize: patientPageSize }}
          onPaginationModelChange={handlePaginationChange}
          onSortModelChange={handleSortChange}
          pageSizeOptions={[10, 20, 50, 100]}
          columnVisibilityModel={columnVisibilityModel}
          disableRowSelectionOnClick
          onRowDoubleClick={({ row }) => navigate(`/patients/${row.id as string}`)}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
            '& .MuiDataGrid-row:hover': { cursor: 'pointer', bgcolor: 'action.hover' },
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : '#F1F5F9',
            },
            '& .MuiDataGrid-cell': { alignItems: 'center' },
          }}
        />
      </Box>

      {/* ── Create patient dialog ── */}
      <PatientFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
    </Box>
  )
}
