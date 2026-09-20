import { computed } from 'vue';
import { useChatStore } from '../stores/chatStore';
export function useTokenUsage() {
  const store = useChatStore();
  const total = computed(() =>
    store.conversations.reduce(
      (sum, c) => sum + c.messages.reduce((s, m) => s + (m.usage?.totalTokens || 0), 0),
      0,
    ),
  );
  return { total };
}
