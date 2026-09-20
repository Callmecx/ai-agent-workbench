import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ZodError } from 'zod';
import multer from 'multer';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';
export function envelope(res: Response, data: unknown, status = 200) {
  return res
    .status(status)
    .json({ success: true, data, error: null, requestId: res.locals.requestId });
}
export function requestContext(req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', res.locals.requestId as string);
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test')
      process.stdout.write(
        JSON.stringify({
          requestId: res.locals.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        }) + '\n',
      );
  });
  next();
}
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  if (!config.accessToken || req.path === '/health') return next();
  const received = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
  const expected = Buffer.from(config.accessToken);
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    return next(new AppError(401, 'UNAUTHORIZED', 'Enter the BFF access token in Settings.'));
  next();
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const err =
    error instanceof AppError
      ? error
      : error instanceof ZodError
        ? new AppError(
            400,
            'VALIDATION_ERROR',
            error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
          )
        : error instanceof multer.MulterError
          ? new AppError(400, 'UPLOAD_ERROR', 'Upload one PDF, TXT or MD file, at most 5 MB.')
          : error instanceof SyntaxError
            ? new AppError(400, 'INVALID_JSON', 'Request body must contain valid JSON.')
            : new AppError(500, 'INTERNAL_ERROR', 'The server could not complete this request.');
  if (!res.headersSent)
    res
      .status(err.status)
      .json({
        success: false,
        data: null,
        error: { code: err.code, message: err.message },
        requestId: res.locals.requestId,
      });
}
