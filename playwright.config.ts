import { defineConfig } from '@playwright/test'

const GO_PORT = 8081
const NEXT_PORT = 3123
const goBackendUrl = `http://localhost:${GO_PORT}`
const origin = `http://localhost:${NEXT_PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: origin,
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'go run .',
      cwd: './server',
      url: `${goBackendUrl}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { PORT: String(GO_PORT) }
    },
    {
      command: `npm run dev -- --port ${NEXT_PORT}`,
      url: origin,
      reuseExistingServer: true,
      timeout: 30_000,
      env: { GO_BACKEND_URL: goBackendUrl }
    }
  ]
})
