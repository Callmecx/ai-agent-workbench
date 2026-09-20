import { api, unwrap } from '../api/client';
import type { KnowledgeBase, KnowledgeDocument, RetrievalResult } from '../types';
export const knowledgeService = {
  list: (signal?: AbortSignal) => unwrap<{ bases: KnowledgeBase[]; documents: KnowledgeDocument[] }>(api.get('/knowledge', { signal })),
  create: (name: string) => unwrap<KnowledgeBase>(api.post('/knowledge', { name })),
  rename: (id: string, name: string) => unwrap<KnowledgeBase>(api.patch(`/knowledge/${id}`, { name })),
  remove: (id: string) => unwrap<null>(api.delete(`/knowledge/${id}`)),
  upload: (id: string, file: File, signal?: AbortSignal) => { const form = new FormData(); form.append('knowledgeBaseId', id); form.append('file', file); return unwrap<KnowledgeDocument>(api.post('/knowledge/upload', form, { signal })); },
  retry: (id: string) => unwrap<KnowledgeDocument>(api.post(`/knowledge/documents/${id}/retry`)),
  removeDocument: (id: string) => unwrap<null>(api.delete(`/knowledge/documents/${id}`)),
  search: (data: { query: string; knowledgeBaseId: string; topK: number; threshold: number }, signal: AbortSignal) => unwrap<{ results: RetrievalResult[]; latencyMs: number; method: string }>(api.post('/knowledge/search', data, { signal })),
};
