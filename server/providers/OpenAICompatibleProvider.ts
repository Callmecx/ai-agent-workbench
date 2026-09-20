import type { ChatRequest, StreamEvent } from '../../shared/types.js';
import { readSSE } from '../../shared/sse.js';
import { config } from '../config.js';
import { AppError, delay } from '../utils/errors.js';
import { type AIProvider, estimateTokens } from './AIProvider.js';
interface ProviderChunk {
  choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: unknown;
}
export class OpenAICompatibleProvider implements AIProvider {
  async *stream(request: ChatRequest, signal: AbortSignal): AsyncGenerator<StreamEvent> {
    if (!config.realEnabled || !config.apiKey)
      throw new AppError(
        503,
        'PROVIDER_NOT_CONFIGURED',
        'Configure server/.env and restart the BFF to enable Real API Mode.',
      );
    if (!config.models.includes(request.model))
      throw new AppError(400, 'INVALID_MODEL', 'Model must be in the server allowlist.');
    const start = Date.now();
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(`${config.apiBase.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map(({ role, content, toolCallId }) => ({
            role,
            content,
            ...(toolCallId ? { tool_call_id: toolCallId } : {}),
          })),
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          top_p: request.topP,
          stream: true,
          stream_options: { include_usage: true },
        }),
      });
      if (response.ok || ![429, 502, 503, 504].includes(response.status) || attempt === 1) break;
      await response.body?.cancel();
      await delay(400, signal); // Retry only before any output; never replay a partial stream.
    }
    if (!response?.ok || !response.body) {
      await response?.body?.cancel();
      throw new AppError(
        502,
        'UPSTREAM_ERROR',
        `AI provider rejected the request (HTTP ${response?.status ?? 'unknown'}). Check server configuration.`,
      );
    }
    let content = '';
    let usage: ProviderChunk['usage'];
    let completed = false;
    for await (const frame of readSSE(response.body)) {
      if (frame === '[DONE]') {
        completed = true;
        break;
      }
      const event = JSON.parse(frame) as ProviderChunk;
      if (event.error)
        throw new AppError(502, 'UPSTREAM_STREAM_ERROR', 'Provider reported a streaming error.');
      if (event.usage) usage = event.usage;
      const delta = event.choices?.[0]?.delta?.content;
      if (delta) {
        content += delta;
        yield { type: 'delta', content: delta };
      }
    }
    if (!completed)
      throw new AppError(
        502,
        'INCOMPLETE_STREAM',
        'The upstream stream ended before its completion marker.',
      );
    const promptTokens =
      usage?.prompt_tokens ?? estimateTokens(request.messages.map((m) => m.content).join('\n'));
    const completionTokens = usage?.completion_tokens ?? estimateTokens(content);
    yield {
      type: 'done',
      data: {
        content,
        model: request.model,
        latencyMs: Date.now() - start,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
          estimated: !usage,
        },
      },
    };
  }
}
