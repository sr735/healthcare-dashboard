import { test, expect } from '@playwright/test'

/**
 * Dashboard page E2E tests.
 *
 * These tests validate that the dashboard loads correctly, shows the expected
 * stat cards and charts, and provides navigation to the patients list.
 *
 * Prerequisites: full Docker Compose stack running (frontend + backend + DB with seed data).
 */

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads and shows the dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('displays the four stat cards', async ({ page }) => {
    // Wait for data to load (skeletons replaced by numbers)
    await expect(page.getByText('Total Patients')).toBeVisible()
    await expect(page.getByText('Active')).toBeVisible()
    await expect(page.getByText('Critical')).toBeVisible()
    await expect(page.getByText('Discharged')).toBeVisible()
  })

  test('stat card total patients shows a non-zero number after data loads', async ({ page }) => {
    // Find the Total Patients stat card value (h4 sibling of the label)
    const totalCard = page.locator(':text("Total Patients") + *').first()
    // Wait until the skeleton is gone (skeleton has role="img" aria-label)
    await page.waitForSelector('.MuiSkeleton-root', { state: 'detached', timeout: 10_000 }).catch(() => {})
    // The h4 value should be a number > 0
    const valueLocator = page.locator('text=Total Patients').locator('.. >> h4')
    await expect(valueLocator).not.toHaveText('0')
  })

  test('shows Patient Status chart section', async ({ page }) => {
    await expect(page.getByText('Patient Status')).toBeVisible()
  })

  test('shows Gender Distribution chart section', async ({ page }) => {
    await expect(page.getByText('Gender Distribution')).toBeVisible()
  })

  test('shows Recent Visits section', async ({ page }) => {
    await expect(page.getByText('Recent Visits')).toBeVisible()
  })

  test('View all button navigates to /patients', async ({ page }) => {
    await page.getByRole('button', { name: /view all/i }).click()
    await expect(page).toHaveURL(/\/patients/)
  })
})
