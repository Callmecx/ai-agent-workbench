import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { chatService } from '../services/chat';
import type { Conversation, RequestState } from '../types';
export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([]);
  const activeId = ref(localStorage.getItem('workbench-active-conversation') || '');
  watch(activeId, (id) => localStorage.setItem('workbench-active-conversation', id));
  const state = ref<RequestState>('IDLE');
  const loaded = ref(false);
  const active = computed(() => conversations.value.find((c) => c.id === activeId.value));
  async function load() {
    conversations.value = await chatService.list();
    if (!active.value) activeId.value = conversations.value[0]?.id || '';
    loaded.value = true;
  }
  async function create() {
    const conversation = await chatService.create();
    conversations.value.unshift(conversation);
    activeId.value = conversation.id;
    state.value = 'IDLE';
    return active.value!;
  }
  async function remove(id: string) {
    await chatService.remove(id);
    conversations.value = conversations.value.filter((c) => c.id !== id);
    if (activeId.value === id) activeId.value = conversations.value[0]?.id || '';
  }
  async function clear() {
    await chatService.clear();
    conversations.value = [];
    activeId.value = '';
    state.value = 'IDLE';
  }
  async function persist(conversation: Conversation) {
    await chatService.save(conversation);
  }
  return { conversations, activeId, active, state, loaded, load, create, remove, clear, persist };
});
