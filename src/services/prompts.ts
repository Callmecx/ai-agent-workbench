import { api, unwrap } from '../api/client';
import type { PromptTemplate } from '../types';
export const promptsService = { list: () => unwrap<PromptTemplate[]>(api.get('/prompts')), save: (prompt: Partial<PromptTemplate>, saveVersion = false) => unwrap<PromptTemplate>(api.post('/prompts', { ...prompt, saveVersion })), remove: (id: string) => unwrap<null>(api.delete(`/prompts/${id}`)) };
