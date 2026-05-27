import { useState } from 'react'
import {
  Box, Typography, Grid2 as Grid, Card, CardContent, CardHeader,
  Button, Chip, Stack, Divider, Skeleton, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Breadcrumbs, Link, CircularProgress, Tab, Tabs,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonIcon from '@mui/icons-material/Person'
import ContactPhoneIcon from '@mui/icons-material/ContactPhone'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import SummarizeIcon from '@mui/icons-material/Summarize'
import { useParams, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import { usePatient, useDeletePatient } from '@/hooks/usePatients'
import { useUiStore } from '@/store/uiStore'
import PatientStatusChip from '@/components/patients/PatientStatusChip'
import PatientFormDialog from '@/components/patients/PatientFormDialog'
import PatientNotes from '@/components/patients/PatientNotes'
import PatientSummary from '@/components/patients/PatientSummary'
import { calcAge, formatDate } from '@/lib/utils'

// ── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box display="flex" py={0.75}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value ?? '—'}
      </Typography>
    </Box>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title, icon, children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader
        avatar={<Box sx={{ color: 'primary.main' }}>{icon}</Box>}
        title={<Typography variant="subtitle1" fontWeight={700}>{title}</Typography>}
        sx={{ pb: 0 }}
      />
      <CardContent>
        <Divider sx={{ mb: 1.5 }} />
        {children}
      </CardContent>
    </Card>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { label: 'Overview',  icon: <PersonIcon fontSize="small" />,    path: '' },
  { label: 'Notes',     icon: <NoteAltIcon fontSize="small" />,   path: '/notes' },
  { label: 'Summary',   icon: <SummarizeIcon fontSize="small" />, path: '/summary' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { showSnackbar } = useUiStore()

  const { data: patient, isLoading, isError, error } = usePatient(id ?? '')
  const deleteMutation = useDeletePatient()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Derive active tab from current URL
  const basePath = `/patients/${id}`
  const suffix = location.pathname.replace(basePath, '')
  const activeTab = TABS.findIndex((t) => t.path === suffix) === -1
    ? 0
    : TABS.findIndex((t) => t.path === suffix)

  async function handleDelete() {
    if (!patient) return
    try {
      await deleteMutation.mutateAsync(patient.id)
      showSnackbar('Patient deleted', 'success')
      navigate('/patients')
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
    setDeleteOpen(false)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rounded" height={48} sx={{ mt: 2, mb: 3 }} />
        <Grid container spacing={3} mt={1}>
          {[1, 2, 3, 4].map((i) => (
            <Grid xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !patient) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Patient not found'}
        <Button size="small" onClick={() => navigate('/patients')} sx={{ ml: 2 }}>
          Back to patients
        </Button>
      </Alert>
    )
  }

  return (
    <Box>
      {/* ── Breadcrumb ── */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/patients" underline="hover" color="inherit">
          Patients
        </Link>
        <Link
          component={RouterLink}
          to={basePath}
          underline="hover"
          color={activeTab === 0 ? 'text.primary' : 'inherit'}
        >
          {patient.last_name}, {patient.first_name}
        </Link>
        {activeTab !== 0 && (
          <Typography color="text.primary">{TABS[activeTab].label}</Typography>
        )}
      </Breadcrumbs>

      {/* ── Header ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h4" fontWeight={700}>
              {patient.first_name} {patient.last_name}
            </Typography>
            <PatientStatusChip status={patient.status} size="medium" />
          </Stack>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {calcAge(patient.date_of_birth)} years old &middot; ID: {patient.id.slice(0, 8)}…
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/patients')}>
            Back
          </Button>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button
            variant="outlined" color="error" startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </Stack>
      </Stack>

      {/* ── Tabs ── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, idx) => navigate(`${basePath}${TABS[idx].path}`)}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.path}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
            />
          ))}
        </Tabs>
      </Box>

      {/* ── Tab content ── */}

      {/* Overview */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid xs={12} md={6}>
            <SectionCard title="Demographics" icon={<PersonIcon />}>
              <InfoRow label="Date of Birth" value={formatDate(patient.date_of_birth)} />
              <InfoRow label="Age" value={`${calcAge(patient.date_of_birth)} years`} />
              <InfoRow label="Gender" value={
                patient.gender === 'prefer_not_to_say' ? 'Prefer not to say' :
                patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
              } />
              <InfoRow label="Blood Type" value={patient.blood_type} />
            </SectionCard>
          </Grid>

          <Grid xs={12} md={6}>
            <SectionCard title="Contact" icon={<ContactPhoneIcon />}>
              <InfoRow label="Email" value={patient.email} />
              <InfoRow label="Phone" value={patient.phone} />
              <InfoRow label="Address" value={
                [patient.address, patient.city, patient.state, patient.zip_code]
                  .filter(Boolean).join(', ') || null
              } />
            </SectionCard>
          </Grid>

          <Grid xs={12} md={6}>
            <SectionCard title="Insurance" icon={<HealthAndSafetyIcon />}>
              <InfoRow label="Provider" value={patient.insurance_provider} />
              <InfoRow label="Member ID" value={patient.insurance_id} />
            </SectionCard>
          </Grid>

          <Grid xs={12} md={6}>
            <SectionCard title="Clinical" icon={<LocalHospitalIcon />}>
              <InfoRow label="Primary Physician" value={patient.primary_physician} />
              <InfoRow label="Last Visit" value={formatDate(patient.last_visit_date)} />
              <InfoRow label="Allergies" value={
                patient.allergies.length > 0 ? (
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {patient.allergies.map((a) => (
                      <Chip key={a} label={a} size="small" color="warning" variant="outlined" />
                    ))}
                  </Stack>
                ) : 'None on record'
              } />
              {patient.medical_notes && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" color="text.secondary" mb={0.5}>Medical Notes</Typography>
                  <Typography variant="body2">{patient.medical_notes}</Typography>
                </>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      )}

      {/* Notes */}
      {activeTab === 1 && <PatientNotes patientId={patient.id} />}

      {/* Summary */}
      {activeTab === 2 && <PatientSummary patientId={patient.id} />}

      {/* ── Edit dialog ── */}
      <PatientFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        patient={patient}
      />

      {/* ── Delete confirmation ── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs">
        <DialogTitle>Delete Patient?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete{' '}
            <strong>{patient.first_name} {patient.last_name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            color="error" variant="contained"
            onClick={() => void handleDelete()}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
