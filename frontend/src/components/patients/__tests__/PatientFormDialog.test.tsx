import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PatientFormDialog from '../PatientFormDialog'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the mutation hooks so tests don't hit the network.
vi.mock('@/hooks/usePatients', () => ({
  useCreatePatient: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useReplacePatient: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

// The component uses showSnackbar from the UI store.
const mockShowSnackbar = vi.fn()
vi.mock('@/store/uiStore', () => ({
  useUiStore: () => ({ showSnackbar: mockShowSnackbar }),
}))

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

interface RenderProps {
  open?: boolean
  mode?: 'create' | 'edit'
  patient?: object | null
  onClose?: () => void
}

function renderDialog({
  open = true,
  mode = 'create',
  patient = null,
  onClose = vi.fn(),
}: RenderProps = {}) {
  return {
    onClose,
    ...render(
      <QueryClientProvider client={makeQueryClient()}>
        <PatientFormDialog
          open={open}
          mode={mode}
          patient={patient as never}
          onClose={onClose}
        />
      </QueryClientProvider>
    ),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PatientFormDialog', () => {
  beforeEach(() => {
    mockShowSnackbar.mockClear()
  })

  // ── Visibility ──────────────────────────────────────────────────────────

  it('renders dialog title "Add Patient" in create mode', () => {
    renderDialog({ mode: 'create' })
    expect(screen.getByText('Add Patient')).toBeInTheDocument()
  })

  it('renders dialog title "Edit Patient" in edit mode', () => {
    const patient = {
      id: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
      first_name: 'Jane',
      last_name: 'Smith',
      date_of_birth: '1985-03-15',
      gender: 'female',
      status: 'active',
      allergies: [],
      blood_type: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zip_code: null,
      primary_physician: null,
      insurance_provider: null,
      insurance_id: null,
      medical_notes: null,
      last_visit_date: null,
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    }
    renderDialog({ mode: 'edit', patient })
    expect(screen.getByText('Edit Patient')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    renderDialog({ open: false })
    expect(screen.queryByText('Add Patient')).toBeNull()
  })

  // ── Required field validation ────────────────────────────────────────────

  it('shows "First name is required" when submitting with empty first name', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/last name/i), 'Smith')
    await user.type(screen.getByLabelText(/date of birth/i), '1990-05-20')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument()
    })
  })

  it('shows "Last name is required" when submitting with empty last name', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/date of birth/i), '1990-05-20')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
    })
  })

  it('shows "Date of birth is required" when submitting with empty DOB', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Smith')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
    })
  })

  // ── Optional field format validation ────────────────────────────────────

  it('shows email format error for an invalid email', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Smith')
    await user.type(screen.getByLabelText(/date of birth/i), '1990-05-20')
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('shows ZIP code format error for an invalid ZIP', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Smith')
    await user.type(screen.getByLabelText(/date of birth/i), '1990-05-20')
    await user.type(screen.getByLabelText(/zip/i), 'BADZIP')

    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/ZIP code must be 5 digits/i)).toBeInTheDocument()
    })
  })

  // ── Cancel button ────────────────────────────────────────────────────────

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderDialog({ onClose })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
