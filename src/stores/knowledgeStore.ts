import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { knowledgeService } from '../services/knowledge';
import type { KnowledgeBase, KnowledgeDocument } from '../types';
export const useKnowledgeStore = defineStore('knowledge', () => { const bases = ref<KnowledgeBase[]>([]); const documents = ref<KnowledgeDocument[]>([]); const selectedId = ref('kb-product'); const selectedDocuments = computed(() => documents.value.filter((d) => d.knowledgeBaseId === selectedId.value)); async function load(signal?: AbortSignal) { const data = await knowledgeService.list(signal); bases.value = data.bases; documents.value = data.documents; if (!bases.value.some((b) => b.id === selectedId.value)) selectedId.value = bases.value[0]?.id || ''; } return { bases, documents, selectedId, selectedDocuments, load }; });
