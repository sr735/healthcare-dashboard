import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid2 as Grid, TextField, MenuItem, FormControl, InputLabel,
  Select, Divider, Typography, CircularProgress, Chip, Box,
  IconButton, InputAdornment, Alert,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import { useCreatePatient, useReplacePatient } from '@/hooks/usePatients'
import { useUiStore } from '@/store/uiStore'
import { ValidationError } from '@/lib/axios'
import type { Patient, PatientCreate, Gender, PatientStatus, BloodType } from '@/types'

// ── Internal form state (all strings — avoids null/undefined control issues) ──

interface FormState {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: Gender
  blood_type: string        // '' means null
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  status: PatientStatus
  primary_physician: string
  insurance_provider: string
  insurance_id: string
  allergies: string[]
  medical_notes: string
  last_visit_date: string   // '' means null
}

const EMPTY_FORM: FormState = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'male',
  blood_type: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  status: 'active',
  primary_physician: '',
  insurance_provider: '',
  insurance_id: '',
  allergies: [],
  medical_notes: '',
  last_visit_date: '',
}

function patientToForm(p: Patient): FormState {
  return {
    first_name: p.first_name,
    last_name: p.last_name,
    date_of_birth: p.date_of_birth,
    gender: p.gender,
    blood_type: p.blood_type ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    zip_code: p.zip_code ?? '',
    status: p.status,
    primary_physician: p.primary_physician ?? '',
    insurance_provider: p.insurance_provider ?? '',
    insurance_id: p.insurance_id ?? '',
    allergies: p.allergies,
    medical_notes: p.medical_notes ?? '',
    last_visit_date: p.last_visit_date ?? '',
  }
}

/** Convert internal FormState back to the API payload. Empty optional strings → null. */
function formToPayload(f: FormState): PatientCreate {
  const opt = (s: string) => s.trim() || null
  return {
    first_name: f.first_name.trim(),
    last_name: f.last_name.trim(),
    date_of_birth: f.date_of_birth,
    gender: f.gender,
    blood_type: (f.blood_type || null) as BloodType | null,
    email: opt(f.email),
    phone: opt(f.phone),
    address: opt(f.address),
    city: opt(f.city),
    state: opt(f.state),
    zip_code: opt(f.zip_code),
    status: f.status,
    primary_physician: opt(f.primary_physician),
    insurance_provider: opt(f.insurance_provider),
    insurance_id: opt(f.insurance_id),
    allergies: f.allergies,
    medical_notes: opt(f.medical_notes),
    last_visit_date: f.last_visit_date || null,
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

interface FormErrors {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  email?: string
  phone?: string
  zip_code?: string
  last_visit_date?: string
  // server-side errors keyed by field name
  [key: string]: string | undefined
}

const PHONE_RE = /^[+\d][\d\s\-().]{6,19}$/
const ZIP_RE   = /^\d{5}(-\d{4})?$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(f: FormState): FormErrors {
  const errors: FormErrors = {}

  // Required string fields
  if (!f.first_name.trim()) {
    errors.first_name = 'First name is required'
  } else if (f.first_name.trim().length > 100) {
    errors.first_name = 'First name must be 100 characters or fewer'
  }

  if (!f.last_name.trim()) {
    errors.last_name = 'Last name is required'
  } else if (f.last_name.trim().length > 100) {
    errors.last_name = 'Last name must be 100 characters or fewer'
  }

  // Date of birth: required, must not be in the future, must not be implausibly old
  if (!f.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required'
  } else {
    const dob = new Date(f.date_of_birth)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dob > today) {
      errors.date_of_birth = 'Date of birth cannot be in the future'
    } else if (dob < new Date('1900-01-01')) {
      errors.date_of_birth = 'Please enter a valid date of birth'
    }
  }

  // Optional fields — only validate format when a value is provided
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) {
    errors.email = 'Please enter a valid email address'
  }

  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) {
    errors.phone = 'Please enter a valid phone number'
  }

  if (f.zip_code.trim() && !ZIP_RE.test(f.zip_code.trim())) {
    errors.zip_code = 'ZIP code must be 5 digits (or 5+4 format)'
  }

  if (f.last_visit_date) {
    const visit = new Date(f.last_visit_date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (visit > today) {
      errors.last_visit_date = 'Last visit date cannot be in the future'
    }
  }

  return errors
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PatientFormDialogProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  patient?: Patient
}

export default function PatientFormDialog({
  open, onClose, mode, patient,
}: PatientFormDialogProps) {
  const { showSnackbar } = useUiStore()
  const createMutation = useCreatePatient()
  const replaceMutation = useReplacePatient()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [allergyInput, setAllergyInput] = useState('')

  // Populate form when dialog opens
  useEffect(() => {
    if (open) {
      setForm(patient ? patientToForm(patient) : EMPTY_FORM)
      setErrors({})
      setServerError(null)
      setAllergyInput('')
    }
  }, [open, patient])

  const isBusy = createMutation.isPending || replaceMutation.isPending

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear any error on this field when the user starts correcting it
    if (errors[key as string] !== undefined) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  function txt(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setField(key, e.target.value as FormState[typeof key])
    }
  }

  function addAllergy() {
    const trimmed = allergyInput.trim()
    if (trimmed && !form.allergies.includes(trimmed)) {
      setField('allergies', [...form.allergies, trimmed])
    }
    setAllergyInput('')
  }

  function removeAllergy(a: string) {
    setField('allergies', form.allergies.filter((x) => x !== a))
  }

  async function handleSubmit() {
    // Client-side validation
    const clientErrors = validate(form)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setServerError(null)
    const payload = formToPayload(form)

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
        showSnackbar('Patient created successfully', 'success')
      } else if (patient) {
        await replaceMutation.mutateAsync({ id: patient.id, payload })
        showSnackbar('Patient updated successfully', 'success')
      }
      onClose()
    } catch (err) {
      if (err instanceof ValidationError) {
        // Map server field errors to inline form errors
        const fieldErrs: FormErrors = {}
        for (const fe of err.fieldErrors) {
          fieldErrs[fe.field] = fe.message
        }
        setErrors(fieldErrs)
        // Fallback banner if no specific field errors were mapped
        if (err.fieldErrors.length === 0) {
          setServerError(err.message)
        }
      } else if (err instanceof Error) {
        // Network failure, 5xx, etc. — show as banner inside dialog
        const isNetworkError =
          err.message.toLowerCase().includes('network') ||
          err.message.toLowerCase().includes('timeout') ||
          err.message.toLowerCase().includes('econnrefused')
        setServerError(
          isNetworkError
            ? 'Could not reach the server. Please check your connection and try again.'
            : err.message,
        )
      } else {
        setServerError('An unexpected error occurred. Please try again.')
      }
    }
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          {mode === 'create' ? 'Add New Patient' : 'Edit Patient'}
        </Typography>
        <IconButton onClick={onClose} disabled={isBusy} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Server-level error banner */}
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}
        {/* Client-validation summary (shown only when errors exist but no specific banner) */}
        {hasErrors && !serverError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please correct the highlighted fields before submitting.
          </Alert>
        )}

        <Grid container spacing={2}>

          {/* ── Demographics ── */}
          <Grid xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>
              DEMOGRAPHICS
            </Typography>
          </Grid>

          <Grid xs={12} sm={6}>
            <TextField fullWidth required label="First Name" size="small"
              value={form.first_name}
              onChange={txt('first_name')}
              error={Boolean(errors.first_name)}
              helperText={errors.first_name}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth required label="Last Name" size="small"
              value={form.last_name}
              onChange={txt('last_name')}
              error={Boolean(errors.last_name)}
              helperText={errors.last_name}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth required label="Date of Birth" size="small" type="date"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: new Date().toISOString().split('T')[0] } }}
              value={form.date_of_birth}
              onChange={txt('date_of_birth')}
              error={Boolean(errors.date_of_birth)}
              helperText={errors.date_of_birth}
            />
          </Grid>
          <Grid xs={12} sm={3}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Gender</InputLabel>
              <Select label="Gender" value={form.gender}
                onChange={(e) => setField('gender', e.target.value as Gender)}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
                <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Blood Type</InputLabel>
              <Select label="Blood Type" value={form.blood_type}
                onChange={(e) => setField('blood_type', e.target.value)}
              >
                <MenuItem value=""><em>Unknown</em></MenuItem>
                {(['A+','A-','B+','B-','AB+','AB-','O+','O-'] as BloodType[]).map((bt) => (
                  <MenuItem key={bt} value={bt}>{bt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12}><Divider /></Grid>

          {/* ── Contact ── */}
          <Grid xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>
              CONTACT
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth label="Email" size="small" type="email"
              value={form.email}
              onChange={txt('email')}
              error={Boolean(errors.email)}
              helperText={errors.email ?? 'e.g. patient@example.com'}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth label="Phone" size="small"
              value={form.phone}
              onChange={txt('phone')}
              error={Boolean(errors.phone)}
              helperText={errors.phone ?? 'e.g. +1 (555) 000-0000'}
            />
          </Grid>
          <Grid xs={12}>
            <TextField fullWidth label="Address" size="small"
              value={form.address} onChange={txt('address')} />
          </Grid>
          <Grid xs={12} sm={5}>
            <TextField fullWidth label="City" size="small"
              value={form.city} onChange={txt('city')} />
          </Grid>
          <Grid xs={12} sm={4}>
            <TextField fullWidth label="State" size="small"
              value={form.state} onChange={txt('state')}
              slotProps={{ htmlInput: { maxLength: 50 } }}
            />
          </Grid>
          <Grid xs={12} sm={3}>
            <TextField fullWidth label="ZIP Code" size="small"
              value={form.zip_code}
              onChange={txt('zip_code')}
              error={Boolean(errors.zip_code)}
              helperText={errors.zip_code}
              slotProps={{ htmlInput: { maxLength: 10 } }}
            />
          </Grid>

          <Grid xs={12}><Divider /></Grid>

          {/* ── Clinical ── */}
          <Grid xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>
              CLINICAL
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status}
                onChange={(e) => setField('status', e.target.value as PatientStatus)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="discharged">Discharged</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth label="Primary Physician" size="small"
              value={form.primary_physician} onChange={txt('primary_physician')}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth label="Insurance Provider" size="small"
              value={form.insurance_provider} onChange={txt('insurance_provider')} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth label="Insurance ID" size="small"
              value={form.insurance_id} onChange={txt('insurance_id')} />
          </Grid>
          <Grid xs={12} sm={6}>
            <TextField fullWidth label="Last Visit Date" size="small" type="date"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: new Date().toISOString().split('T')[0] } }}
              value={form.last_visit_date}
              onChange={txt('last_visit_date')}
              error={Boolean(errors.last_visit_date)}
              helperText={errors.last_visit_date}
            />
          </Grid>

          {/* ── Allergies ── */}
          <Grid xs={12}>
            <TextField fullWidth label="Add Allergy" size="small"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() } }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={addAllergy} disabled={!allergyInput.trim()}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              helperText="Press Enter or click + to add"
            />
            {form.allergies.length > 0 && (
              <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                {form.allergies.map((a) => (
                  <Chip key={a} label={a} size="small"
                    onDelete={() => removeAllergy(a)}
                    color="warning" variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Grid>

          <Grid xs={12}>
            <TextField fullWidth label="Medical Notes" size="small" multiline rows={3}
              value={form.medical_notes}
              onChange={txt('medical_notes')}
              slotProps={{ htmlInput: { maxLength: 5000 } }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isBusy}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={isBusy}
          startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {mode === 'create' ? 'Create Patient' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
