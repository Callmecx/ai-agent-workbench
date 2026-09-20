import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'visual.spec.ts',
  timeout: 120000,
  outputDir: 'test-results/visual',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'edge-visual', use: { channel: 'msedge', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5175',
      env: { WEB_PORT: '5175', BFF_PROXY_TARGET: 'http://127.0.0.1:3004' },
      reuseExistingServer: false,
    },
    {
      command: 'npx tsx server/index.ts',
      url: 'http://127.0.0.1:3004/api/health',
      env: {
        PORT: '3004',
        DATA_FILE: `test-results/visual-${Date.now()}.json`,
        RATE_LIMIT_PER_MINUTE: '1000',
        ALLOW_REAL_API: 'false',
        BFF_ACCESS_TOKEN: '',
        FRONTEND_ORIGIN: 'http://127.0.0.1:5175',
      },
      reuseExistingServer: false,
    },
  ],
});
