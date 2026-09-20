import { api, unwrap } from '../api/client';
import type { Metrics } from '../types';
export const getMetrics = (from: string, to: string, samples: boolean, signal: AbortSignal) => unwrap<Metrics>(api.get('/metrics', { params: { from, to, samples }, signal }));
