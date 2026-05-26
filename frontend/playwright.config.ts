import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration.
 *
 * Tests assume the full stack (frontend + backend + database) is reachable.
 * Run with the Docker Compose stack started:
 *
 *   docker compose up -d
 *   npx playwright test
 *
 * Or set PLAYWRIGHT_BASE_URL to point at a different environment.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // serial to avoid race conditions on shared DB state
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start the Vite dev server when running locally (not in CI,
  // where the Docker stack is expected to be already running).
  webServer: process.env['CI']
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30_000,
      },
})
