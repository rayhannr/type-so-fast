import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3123',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 3123',
    url: 'http://localhost:3123',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
