import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ChatRequest, StreamEvent } from '../../shared/types.js';
import { MockAIProvider } from '../providers/MockAIProvider.js';
import { OpenAICompatibleProvider } from '../providers/OpenAICompatibleProvider.js';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';
import { record } from '../services/database.js';
const schema = z.object({ messages: z.array(z.object({ id: z.string(), role: z.enum(['system', 'user', 'assistant', 'tool']), content: z.string().max(100000), createdAt: z.string(), toolCallId: z.string().optional() })).min(1).max(100), model: z.string().min(1).max(100), mode: z.enum(['mock', 'real']), temperature: z.number().min(0).max(2), maxTokens: z.number().int().min(16).max(8192), contextLength: z.number().int().min(512).max(128000), topP: z.number().min(0).max(1), timeoutMs: z.number().min(1000).max(120000), simulate: z.enum(['error', 'timeout']).optional() });
export async function chat(req: Request, res: Response) {
  const input: ChatRequest = schema.parse(req.body);
  if (input.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 3) + 4, 0) + input.maxTokens > input.contextLength) throw new AppError(400, 'CONTEXT_LIMIT', 'Messages and reserved output exceed the configured context budget.');
  const controller = new AbortController(); const start = Date.now(); let tokens = 0; let success = false;
  const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), Math.min(input.timeoutMs, config.timeout));
  const disconnect = () => { if (!res.writableEnded) controller.abort(new DOMException('Client disconnected', 'AbortError')); };
  res.on('close', disconnect);
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const emit = (event: StreamEvent) => { if (!res.destroyed) res.write(`data: ${JSON.stringify({ success: event.type !== 'error', data: event.type === 'error' ? null : event, error: event.type === 'error' ? event.error : null, requestId: res.locals.requestId })}\n\n`); };
  try {
    const provider = input.mode === 'mock' ? new MockAIProvider() : new OpenAICompatibleProvider();
    for await (const event of provider.stream(input, controller.signal)) { emit(event); if (event.type === 'done') { success = true; tokens = event.data.usage.totalTokens; } }
  } catch (error) {
    const timedOut = controller.signal.aborted && (controller.signal.reason as Error)?.name === 'TimeoutError';
    emit({ type: 'error', error: { code: timedOut ? 'TIMEOUT' : error instanceof AppError ? error.code : 'STREAM_ERROR', message: timedOut ? 'Request timed out. Increase the timeout or retry.' : error instanceof AppError ? error.message : 'The stream was interrupted. Please retry.' } });
  } finally {
    clearTimeout(timeout); res.off('close', disconnect);
    record({ kind: 'chat', model: input.model, mock: input.mode === 'mock', success, aborted: controller.signal.aborted && (controller.signal.reason as Error)?.name === 'AbortError', latencyMs: Date.now() - start, tokens });
    res.end();
  }
}
