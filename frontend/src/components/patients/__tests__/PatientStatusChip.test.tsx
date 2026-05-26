import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PatientStatusChip from '../PatientStatusChip'

// MUI components render fine in jsdom without a ThemeProvider.

describe('PatientStatusChip', () => {
  it('renders "Active" label for active status', () => {
    render(<PatientStatusChip status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders "Critical" label for critical status', () => {
    render(<PatientStatusChip status="critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders "Inactive" label for inactive status', () => {
    render(<PatientStatusChip status="inactive" />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('renders "Discharged" label for discharged status', () => {
    render(<PatientStatusChip status="discharged" />)
    expect(screen.getByText('Discharged')).toBeInTheDocument()
  })

  it('renders a chip element (role="button" or no specific role — just a span wrapper)', () => {
    const { container } = render(<PatientStatusChip status="active" />)
    // MUI Chip renders a <div> with class MuiChip-root
    const chip = container.querySelector('.MuiChip-root')
    expect(chip).not.toBeNull()
  })

  it('accepts a size prop without throwing', () => {
    expect(() => render(<PatientStatusChip status="active" size="medium" />)).not.toThrow()
  })

  it('defaults size to small', () => {
    const { container } = render(<PatientStatusChip status="active" />)
    const chip = container.querySelector('.MuiChip-sizeSmall')
    expect(chip).not.toBeNull()
  })
})
