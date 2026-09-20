import { onBeforeUnmount, ref } from 'vue';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useStreaming } from './useStreaming';
import { selectContext } from '../utils/context';
import { normalizeError } from '../api/client';
import type { APIError, Message } from '../types';
export function useChat() {
  const store = useChatStore(); const settings = useSettingsStore(); const stream = useStreaming(); const localError = ref<APIError>(); let disposed = false; let submitting = false;
  const make = (role: Message['role'], content: string): Message => ({ id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() });
  async function send(text: string, retry = false, simulate?: 'error' | 'timeout') {
    if (submitting || stream.busy.value || (!retry && !text.trim())) return;
    submitting = true; localError.value = undefined; store.state = 'SUBMITTING';
    try {
      const conversation = store.active || await store.create(); store.state = 'SUBMITTING';
      if (!conversation.messages.length) conversation.messages.push(make('system', 'You are a helpful assistant. Be accurate, structured and explicit about uncertainty.'));
      if (retry) { const lastUser = conversation.messages.findLastIndex((m) => m.role === 'user'); if (lastUser < 0) return; conversation.messages.splice(lastUser + 1); }
      else { conversation.messages.push(make('user', text.trim())); if (conversation.title === 'New conversation') conversation.title = text.trim().slice(0, 46); }
      const messages = selectContext(conversation.messages, settings.settings.contextLength, settings.settings.maxTokens);
      const assistant = make('assistant', ''); assistant.status = 'SUBMITTING'; conversation.messages.push(assistant);
      const target = conversation.messages[conversation.messages.length - 1]!;
      const response = await stream.start({ ...settings.settings, messages, simulate }, (content) => { target.content = content; target.status = 'STREAMING'; store.state = 'STREAMING'; });
      target.status = disposed ? 'ABORTED' : stream.state.value; store.state = target.status;
      if (response) { target.content = response.content; target.usage = response.usage; target.latencyMs = response.latencyMs; target.model = response.model; }
      conversation.updatedAt = new Date().toISOString();
      await store.persist(conversation);
    } catch (reason) { if (!disposed) { localError.value = normalizeError(reason); store.state = 'ERROR'; } }
    finally { submitting = false; }
  }
  onBeforeUnmount(() => { disposed = true; stream.stop(); });
  return { ...stream, localError, send };
}
