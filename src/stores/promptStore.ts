import { defineStore } from 'pinia';
import { ref } from 'vue';
import { promptsService } from '../services/prompts';
import type { PromptTemplate } from '../types';
export const usePromptStore = defineStore('prompts', () => {
  const prompts = ref<PromptTemplate[]>([]);
  async function load() {
    prompts.value = await promptsService.list();
  }
  async function save(prompt: Partial<PromptTemplate>, version = false) {
    const saved = await promptsService.save(prompt, version);
    const index = prompts.value.findIndex((p) => p.id === saved.id);
    if (index < 0) prompts.value.push(saved);
    else prompts.value[index] = saved;
    return saved;
  }
  async function remove(id: string) {
    await promptsService.remove(id);
    prompts.value = prompts.value.filter((p) => p.id !== id);
  }
  return { prompts, load, save, remove };
});
