import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { resolve } from 'node:path';
import { config } from './config.js';
import { authenticate, errorHandler, requestContext } from './middleware/http.js';
import routes from './routes/index.js';
import { AppError } from './utils/errors.js';
export const app = express();
app.disable('x-powered-by');
app.use(
  requestContext,
  helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }),
  cors({ origin: config.origin, exposedHeaders: ['X-Request-ID'] }),
  express.json({ limit: '2mb' }),
);
app.use(
  '/api',
  authenticate,
  rateLimit({
    windowMs: 60000,
    limit: config.rateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(
        new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a minute and try again.'),
      ),
  }),
  routes,
);
app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'API route not found.')));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
}
app.use(errorHandler);
