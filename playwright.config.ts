import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1512, height: 982 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1512, height: 982 },
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5174',
      env: { WEB_PORT: '5174', BFF_PROXY_TARGET: 'http://127.0.0.1:3002' },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npx tsx server/index.ts',
      url: 'http://127.0.0.1:3002/api/health',
      env: {
        PORT: '3002',
        DATA_FILE: `test-results/e2e-${Date.now()}.json`,
        RATE_LIMIT_PER_MINUTE: '1000',
        ALLOW_REAL_API: 'false',
        BFF_ACCESS_TOKEN: '',
        FRONTEND_ORIGIN: 'http://127.0.0.1:5174',
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
