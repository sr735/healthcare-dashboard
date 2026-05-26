import { memo } from 'react'
import { Chip } from '@mui/material'
import type { PatientStatus } from '@/types'

const STATUS_CONFIG: Record<
  PatientStatus,
  { label: string; color: 'success' | 'error' | 'default' | 'primary' }
> = {
  active: { label: 'Active', color: 'success' },
  critical: { label: 'Critical', color: 'error' },
  inactive: { label: 'Inactive', color: 'default' },
  discharged: { label: 'Discharged', color: 'primary' },
}

interface PatientStatusChipProps {
  status: PatientStatus
  size?: 'small' | 'medium'
}

// memo: rendered once per DataGrid row — skips re-render when parent state
// changes (filters, pagination) but the status value itself hasn't changed.
const PatientStatusChip = memo(function PatientStatusChip({
  status, size = 'small',
}: PatientStatusChipProps) {
  const { label, color } = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive
  return <Chip label={label} color={color} size={size} variant="filled" />
})

export default PatientStatusChip
