import { api, getAccessToken, unwrap } from '../api/client';
import { readSSE } from '../../shared/sse';
import type { AIModel, APIResponse, ChatRequest, Conversation, Health, StreamEvent } from '../types';
export const chatService = {
  health: () => unwrap<Health>(api.get('/health')),
  models: () => unwrap<{ mock: AIModel[]; real: AIModel[] }>(api.get('/models')),
  list: () => unwrap<Conversation[]>(api.get('/conversations')),
  create: () => unwrap<Conversation>(api.post('/conversations', { title: 'New conversation' })),
  save: (conversation: Conversation) => unwrap<Conversation>(api.put(`/conversations/${conversation.id}`, conversation)),
  remove: (id: string) => unwrap<null>(api.delete(`/conversations/${id}`)),
  clear: () => unwrap<null>(api.delete('/conversations')),
};
export async function streamChat(request: ChatRequest, signal: AbortSignal, onEvent: (event: StreamEvent) => void) {
  const response = await fetch(`${api.defaults.baseURL}/chat`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) }, body: JSON.stringify(request) });
  if (!response.ok) { const body = await response.json() as APIResponse<never>; throw { ...(body.error || { code: 'HTTP_ERROR', message: `Request failed (${response.status}).` }), requestId: body.requestId }; }
  if (!response.body) throw new Error('Streaming is not supported by this browser.');
  let done = false;
  for await (const frame of readSSE(response.body)) { const packet = JSON.parse(frame) as APIResponse<StreamEvent>; if (!packet.success) throw { ...packet.error, requestId: packet.requestId }; if (packet.data) { onEvent(packet.data); if (packet.data.type === 'done') done = true; } }
  if (!done) throw new Error('The stream ended unexpectedly. Retry to generate a complete answer.');
}
