import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { z } from 'zod';
import { chatService } from '../services/chat';
import type { AIModel, Health } from '../types';
const schema = z.object({ mode: z.enum(['mock', 'real']).default('mock'), model: z.string().default('workbench-mock'), temperature: z.number().min(0).max(2).default(0.7), maxTokens: z.number().min(16).max(8192).default(1024), contextLength: z.number().min(512).max(128000).default(16000), topP: z.number().min(0).max(1).default(1), timeoutMs: z.number().min(1000).max(120000).default(60000), theme: z.enum(['light', 'dark']).default('light') });
function initial() { try { return schema.parse(JSON.parse(localStorage.getItem('workbench-settings') || '{}')); } catch { return schema.parse({}); } }
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(initial()); const health = ref<Health>(); const models = ref<{ mock: AIModel[]; real: AIModel[] }>({ mock: [], real: [] }); const online = ref(false);
  const availableModels = computed(() => models.value[settings.value.mode]);
  watch(settings, (value) => { localStorage.setItem('workbench-settings', JSON.stringify(value)); document.documentElement.dataset.theme = value.theme; }, { deep: true, immediate: true });
  async function check() { try { health.value = await chatService.health(); online.value = true; models.value = await chatService.models(); if (!availableModels.value.some((m) => m.id === settings.value.model)) settings.value.model = availableModels.value[0]?.id || 'workbench-mock'; } catch (error) { online.value = false; throw error; } }
  function setMode(mode: 'mock' | 'real') { settings.value.mode = mode; settings.value.model = models.value[mode][0]?.id || (mode === 'mock' ? 'workbench-mock' : ''); }
  return { settings, health, models, online, availableModels, check, setMode };
});
