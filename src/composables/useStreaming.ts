import { computed, onBeforeUnmount, ref } from 'vue';
import { streamChat } from '../services/chat';
import { normalizeError } from '../api/client';
import { isBusy, transition } from '../utils/state';
import type { APIError, ChatRequest, ChatResponse, RequestState } from '../types';
export function useStreaming() {
  const state = ref<RequestState>('IDLE');
  const content = ref('');
  const result = ref<ChatResponse>();
  const error = ref<APIError>();
  const busy = computed(() => isBusy(state.value));
  let controller: AbortController | undefined;
  let disposed = false;
  async function start(
    request: ChatRequest,
    onDelta?: (content: string) => void,
  ): Promise<ChatResponse | undefined> {
    if (busy.value || disposed) return;
    controller = new AbortController();
    state.value = transition(state.value, 'SUBMITTING');
    content.value = '';
    error.value = undefined;
    result.value = undefined;
    const timer = window.setTimeout(
      () => controller?.abort(new DOMException('Request timed out', 'TimeoutError')),
      request.timeoutMs + 1500,
    );
    try {
      await streamChat(request, controller.signal, (event) => {
        if (disposed) return;
        if (event.type === 'delta') {
          if (state.value === 'SUBMITTING') state.value = transition(state.value, 'STREAMING');
          content.value += event.content;
          onDelta?.(content.value);
        }
        if (event.type === 'done') {
          result.value = event.data;
          content.value = event.data.content;
        }
      });
      if (!disposed) state.value = transition(state.value, 'SUCCESS');
    } catch (reason) {
      if (!disposed) {
        const timeout =
          controller.signal.aborted && (controller.signal.reason as Error)?.name === 'TimeoutError';
        if (controller.signal.aborted && !timeout) state.value = transition(state.value, 'ABORTED');
        else {
          error.value = timeout
            ? { code: 'TIMEOUT', message: 'Request timed out. Please retry.' }
            : normalizeError(reason);
          state.value = transition(state.value, 'ERROR');
        }
      }
    } finally {
      window.clearTimeout(timer);
    }
    return result.value as ChatResponse | undefined;
  }
  function stop() {
    controller?.abort();
  }
  onBeforeUnmount(() => {
    disposed = true;
    controller?.abort();
  });
  return { state, content, result, error, busy, start, stop };
}
