export type * from '../../shared/types.js';
import type { Request } from 'express';
export interface IdentifiedRequest extends Request {
  requestId: string;
}
