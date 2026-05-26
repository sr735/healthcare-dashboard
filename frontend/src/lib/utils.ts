import { format, parseISO, differenceInYears } from 'date-fns'

/** Calculate age from an ISO date string (YYYY-MM-DD). */
export function calcAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), parseISO(dateOfBirth))
}

/** Format an ISO date string for display (e.g. "Jan 14, 2026"). */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

/** Format an ISO datetime string as a short date. */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
  } catch {
    return '—'
  }
}

/** Capitalise first letter of each word. */
export function titleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
