import type { RetrievalResult } from '../../shared/types.js';
import { db, save } from './database.js';
import { delay } from '../utils/errors.js';
const processing = new Set<string>();
export function refreshBase(id: string) {
  const base = db.bases.find((b) => b.id === id); if (!base) return;
  const docs = db.documents.filter((d) => d.knowledgeBaseId === id);
  base.documentCount = docs.length; base.chunkCount = docs.reduce((sum, d) => sum + d.chunkCount, 0);
  base.embeddingStatus = docs.some((d) => d.status === 'FAILED') ? 'FAILED' : docs.length && docs.every((d) => d.status === 'READY') ? 'READY' : 'PENDING';
}
export async function processDocument(id: string) {
  if (processing.has(id)) return;
  processing.add(id);
  try {
    for (const status of ['PARSING', 'EMBEDDING', 'READY'] as const) {
      await delay(800);
      const doc = db.documents.find((d) => d.id === id); if (!doc) return;
      if (status === 'EMBEDDING' && !doc.text.trim()) { doc.status = 'FAILED'; doc.embeddingStatus = 'FAILED'; doc.error = 'Document has no readable text. Upload a non-empty TXT/MD file or retry the mock PDF simulation.'; refreshBase(doc.knowledgeBaseId); save(); return; }
      doc.status = status; doc.embeddingStatus = status === 'PARSING' ? 'PENDING' : status;
      if (status === 'READY') {
        db.chunks = db.chunks.filter((c) => c.documentId !== id);
        for (let offset = 0, index = 0; offset < doc.text.length; offset += 420, index++) {
          const text = doc.text.slice(offset, offset + 500);
          db.chunks.push({ id: `${id}-chunk-${index}`, documentId: id, knowledgeBaseId: doc.knowledgeBaseId, text, metadata: { source: doc.name, index, characters: text.length, mock: true } });
        }
        doc.chunkCount = db.chunks.filter((c) => c.documentId === id).length;
      }
      refreshBase(doc.knowledgeBaseId); save();
    }
  } finally { processing.delete(id); }
}
export function searchKnowledge(query: string, baseId: string, topK: number, threshold: number): RetrievalResult[] {
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])];
  return db.chunks.filter((c) => c.knowledgeBaseId === baseId).map((chunk) => {
    const matches = terms.filter((term) => chunk.text.toLowerCase().includes(term)).length;
    return { rank: 0, score: terms.length ? Math.round(matches / terms.length * 100) / 100 : 0, chunk, sourceDocument: chunk.metadata.source };
  }).filter((result) => result.score > 0 && result.score >= threshold).sort((a, b) => b.score - a.score).slice(0, topK).map((r, i) => ({ ...r, rank: i + 1 }));
}
