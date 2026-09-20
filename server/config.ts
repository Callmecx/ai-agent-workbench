import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env', quiet: true });
export const config = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '127.0.0.1',
  origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173',
  apiBase: process.env.AI_API_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.AI_API_KEY || '',
  realEnabled: process.env.ALLOW_REAL_API === 'true',
  models: (process.env.AI_MODELS || 'gpt-4.1-mini')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  timeout: Math.min(120000, Math.max(1000, Number(process.env.REQUEST_TIMEOUT_MS || 60000))),
  rateLimit: Number(process.env.RATE_LIMIT_PER_MINUTE || 60),
  accessToken: process.env.BFF_ACCESS_TOKEN || '',
};
