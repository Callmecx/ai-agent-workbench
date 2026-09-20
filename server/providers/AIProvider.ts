import type { ChatRequest, StreamEvent } from '../../shared/types.js';
export interface AIProvider {
  stream(request: ChatRequest, signal: AbortSignal): AsyncGenerator<StreamEvent>;
}
export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 3));
}
