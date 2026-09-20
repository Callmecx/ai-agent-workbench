import { computed, onBeforeUnmount, ref } from 'vue';
import { normalizeError } from '../api/client';
import type { APIError, RequestState } from '../types';
export function useRequest() {
  const state = ref<RequestState>('IDLE'); const error = ref<APIError>(); let controller: AbortController | undefined; let generation = 0;
  const loading = computed(() => state.value === 'SUBMITTING');
  async function run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    controller?.abort(); const own = ++generation; controller = new AbortController(); state.value = 'SUBMITTING'; error.value = undefined;
    try { const data = await work(controller.signal); if (generation !== own) return; state.value = 'SUCCESS'; return data; }
    catch (reason) { if (generation !== own) return; error.value = normalizeError(reason); state.value = error.value.code === 'ABORTED' ? 'ABORTED' : 'ERROR'; return; }
  }
  function abort() { generation++; controller?.abort(); state.value = 'ABORTED'; }
  onBeforeUnmount(() => { generation++; controller?.abort(); });
  return { state, error, loading, run, abort };
}
