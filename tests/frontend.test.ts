// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AxiosError } from 'axios';
import { createApp, nextTick } from 'vue';
import MarkdownContent from '../src/components/MarkdownContent.vue';
import { normalizeError } from '../src/api/client';
import { useChatStore } from '../src/stores/chatStore';
import { useSettingsStore } from '../src/stores/settingsStore';
vi.mock('../src/services/chat', () => ({
  chatService: {
    list: vi
      .fn()
      .mockResolvedValue([{ id: 'one', title: 'One', messages: [], createdAt: '', updatedAt: '' }]),
    create: vi
      .fn()
      .mockResolvedValue({ id: 'two', title: 'Two', messages: [], createdAt: '', updatedAt: '' }),
    remove: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(null),
  },
}));
beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});
describe('API error normalization', () => {
  it('maps timeouts and cancellation to stable codes', () => {
    expect(normalizeError(new AxiosError('timeout', 'ECONNABORTED')).code).toBe('TIMEOUT');
    expect(normalizeError(new AxiosError('cancelled', 'ERR_CANCELED')).code).toBe('ABORTED');
  });
  it('preserves a BFF request ID and error', () => {
    const error = new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { error: { code: 'RATE_LIMITED', message: 'Wait' }, requestId: 'abc' },
      status: 429,
      statusText: 'error',
      headers: {},
      config: {} as never,
    });
    expect(normalizeError(error)).toEqual({
      code: 'RATE_LIMITED',
      message: 'Wait',
      requestId: 'abc',
    });
  });
});
describe('chat store', () => {
  it('creates, switches and deletes persisted conversations', async () => {
    const store = useChatStore();
    await store.load();
    expect(store.active?.id).toBe('one');
    await store.create();
    expect(store.active?.id).toBe('two');
    await store.remove('two');
    expect(store.active?.id).toBe('one');
    await store.clear();
    expect(store.active).toBeUndefined();
    expect(store.state).toBe('IDLE');
  });
});
describe('settings persistence', () => {
  it('recovers corrupted storage and strips unknown secret properties', async () => {
    localStorage.setItem('workbench-settings', '{bad');
    const store = useSettingsStore();
    expect(store.settings.mode).toBe('mock');
    store.settings.temperature = 0.3;
    await nextTick();
    expect(localStorage.getItem('workbench-settings')).not.toContain('apiKey');
  });
});
describe('markdown security', () => {
  it('renders code and tables without executing raw HTML or unsafe links', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(MarkdownContent, {
      content:
        '<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n```typescript\nconst x = 1;\n```\n\n|a|b|\n|-|-|\n|1|2|',
    });
    app.mount(container);
    await nextTick();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('.copy-code')?.textContent).toBe('Copy code');
    app.unmount();
    container.remove();
  });
});
