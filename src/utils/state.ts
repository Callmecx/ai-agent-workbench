import type { RequestState } from '../types';
export const isBusy = (state: RequestState) => state === 'SUBMITTING' || state === 'STREAMING';
const transitions: Record<RequestState, RequestState[]> = {
  IDLE: ['SUBMITTING'],
  SUBMITTING: ['STREAMING', 'SUCCESS', 'ERROR', 'ABORTED'],
  STREAMING: ['SUCCESS', 'ERROR', 'ABORTED'],
  SUCCESS: ['SUBMITTING', 'IDLE'],
  ERROR: ['SUBMITTING', 'IDLE'],
  ABORTED: ['SUBMITTING', 'IDLE'],
};
export function transition(from: RequestState, to: RequestState) {
  if (!transitions[from].includes(to))
    throw new Error(`Invalid request transition: ${from} → ${to}`);
  return to;
}
