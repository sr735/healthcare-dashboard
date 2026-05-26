import { test, expect, type Page } from '@playwright/test'

/**
 * Patients list and CRUD E2E tests.
 *
 * Tests share a createdPatientId variable to chain create → detail → edit → delete.
 * Each subsequent test is skipped if the prior one didn't produce the ID.
 */

const TIMESTAMP = Date.now()
const TEST_LAST_NAME = `E2eTest${TIMESTAMP}`
const TEST_FIRST_NAME = 'Playwright'
let createdPatientId: string | null = null

async function goToPatients(page: Page) {
  await page.goto('/patients')
  await page.waitForSelector('.MuiDataGrid-root', { timeout: 15_000 })
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

test.describe('Patients list', () => {
  test('loads and shows the Patients heading', async ({ page }) => {
    await goToPatients(page)
    await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible()
  })

  test('DataGrid renders at least one row (seed data)', async ({ page }) => {
    await goToPatients(page)
    await expect(page.locator('.MuiDataGrid-row').first()).toBeVisible()
  })

  test('search input filters the list', async ({ page }) => {
    await goToPatients(page)
    await page.getByPlaceholder(/search/i).fill('zzznomatch_xyz_99')
    await page.waitForTimeout(600)
    await expect(page.locator('.MuiDataGrid-overlay')).toBeVisible({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

test.describe('Patient CRUD', () => {
  test('Create — opens dialog and adds a new patient', async ({ page }) => {
    await goToPatients(page)

    await page.getByRole('button', { name: /add patient/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Add Patient')).toBeVisible()

    await page.getByLabel(/first name/i).fill(TEST_FIRST_NAME)
    await page.getByLabel(/last name/i).fill(TEST_LAST_NAME)
    await page.getByLabel(/date of birth/i).fill('1988-07-15')

    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })

    // Confirm patient appears in list
    await page.getByPlaceholder(/search/i).fill(TEST_LAST_NAME)
    await page.waitForTimeout(600)
    await expect(page.getByText(TEST_LAST_NAME)).toBeVisible({ timeout: 10_000 })
  })

  test('Detail — clicking a row navigates to the patient detail page', async ({ page }) => {
    await goToPatients(page)

    await page.getByPlaceholder(/search/i).fill(TEST_LAST_NAME)
    await page.waitForTimeout(600)

    const row = page.locator('.MuiDataGrid-row').first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.click()

    await expect(page).toHaveURL(/\/patients\/.+/, { timeout: 8_000 })

    const url = page.url()
    const match = url.match(/\/patients\/([\w-]+)/)
    createdPatientId = match?.[1] ?? null

    await expect(page.getByText(TEST_FIRST_NAME)).toBeVisible()
    await expect(page.getByText(TEST_LAST_NAME)).toBeVisible()
  })

  test('Detail — shows patient information sections', async ({ page }) => {
    if (!createdPatientId) test.skip()

    await page.goto(`/patients/${createdPatientId}`)
    await expect(page.getByText(/personal information/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/clinical notes/i)).toBeVisible({ timeout: 8_000 })
  })

  test('Edit — opens edit dialog pre-filled with patient data', async ({ page }) => {
    if (!createdPatientId) test.skip()

    // Edit button lives on the detail page
    await page.goto(`/patients/${createdPatientId}`)
    await expect(page.getByText(TEST_FIRST_NAME)).toBeVisible({ timeout: 8_000 })

    await page.getByRole('button', { name: /^edit$/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Edit Patient')).toBeVisible()

    // First name field should be pre-filled
    await expect(page.getByLabel(/first name/i)).toHaveValue(TEST_FIRST_NAME)

    // Close without saving
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('Delete — removes the patient via detail page delete button', async ({ page }) => {
    if (!createdPatientId) test.skip()

    await page.goto(`/patients/${createdPatientId}`)
    await expect(page.getByText(TEST_FIRST_NAME)).toBeVisible({ timeout: 8_000 })

    // Click Delete → confirmation dialog appears
    await page.getByRole('button', { name: /^delete$/i }).click()

    // Confirm in the MUI confirmation dialog
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete patient/i })
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click()
    }

    // Should navigate back to /patients after deletion
    await expect(page).toHaveURL(/\/patients$/, { timeout: 8_000 })

    // Patient should no longer appear in search
    await page.getByPlaceholder(/search/i).fill(TEST_LAST_NAME)
    await page.waitForTimeout(600)
    await expect(page.getByText(TEST_LAST_NAME)).not.toBeVisible({ timeout: 8_000 })
  })
})

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

test.describe('Validation — PatientFormDialog', () => {
  test('shows validation errors when submitting an empty form', async ({ page }) => {
    await goToPatients(page)
    await page.getByRole('button', { name: /add patient/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText('First name is required')).toBeVisible()
    await expect(page.getByText('Last name is required')).toBeVisible()
    await expect(page.getByText('Date of birth is required')).toBeVisible()
  })

  test('shows invalid email error', async ({ page }) => {
    await goToPatients(page)
    await page.getByRole('button', { name: /add patient/i }).click()

    await page.getByLabel(/first name/i).fill('Test')
    await page.getByLabel(/last name/i).fill('User')
    await page.getByLabel(/date of birth/i).fill('1990-01-01')
    await page.getByLabel(/email/i).fill('bad-email')

    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test('Cancel closes dialog without saving', async ({ page }) => {
    await goToPatients(page)
    await page.getByRole('button', { name: /add patient/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
