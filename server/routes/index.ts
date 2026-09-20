import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { envelope } from '../middleware/http.js';
import { db, record, save } from '../services/database.js';
import { mockModels, tools } from '../mock/seed.js';
import { AppError, delay } from '../utils/errors.js';
import { processDocument, refreshBase, searchKnowledge } from '../services/knowledge.js';
import { executeTool } from '../services/tools.js';
import { chat } from '../controllers/chat.js';
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const nameSchema = z.object({ name: z.string().trim().min(1).max(100) });
router.get('/health', (_req, res) =>
  envelope(res, {
    status: 'healthy',
    realConfigured: config.realEnabled && Boolean(config.apiKey),
    providerBaseUrl: new URL(config.apiBase).origin + new URL(config.apiBase).pathname,
    authenticationRequired: Boolean(config.accessToken),
  }),
);
router.get('/models', (_req, res) =>
  envelope(res, {
    mock: mockModels,
    real: config.models.map((id) => ({
      id,
      name: id,
      family: 'GPT-style',
      available: config.realEnabled && Boolean(config.apiKey),
      contextWindow: 16000,
      description:
        'Server-configured OpenAI-compatible model. Context limit is a workbench setting, not provider metadata.',
    })),
  }),
);
router.post('/chat', chat);
router.get('/conversations', (_req, res) => envelope(res, db.conversations));
router.post('/conversations', (req, res) => {
  const { title } = z
    .object({ title: z.string().trim().min(1).max(120).default('New conversation') })
    .parse(req.body);
  const conversation = {
    id: crypto.randomUUID(),
    title,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.conversations.unshift(conversation);
  save();
  envelope(res, conversation, 201);
});
router.put('/conversations/:id', (req, res) => {
  const conversation = db.conversations.find((c) => c.id === req.params.id);
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'Conversation not found.');
  const data = z
    .object({
      title: z.string().min(1).max(120),
      messages: z
        .array(
          z.object({
            id: z.string(),
            role: z.enum(['system', 'user', 'assistant', 'tool']),
            content: z.string().max(100000),
            createdAt: z.string(),
            model: z.string().optional(),
            status: z
              .enum(['IDLE', 'SUBMITTING', 'STREAMING', 'SUCCESS', 'ERROR', 'ABORTED'])
              .optional(),
            latencyMs: z.number().optional(),
            toolCallId: z.string().optional(),
            usage: z
              .object({
                promptTokens: z.number(),
                completionTokens: z.number(),
                totalTokens: z.number(),
                estimated: z.boolean(),
              })
              .optional(),
          }),
        )
        .max(500),
    })
    .parse(req.body);
  Object.assign(conversation, data, { updatedAt: new Date().toISOString() });
  save();
  envelope(res, conversation);
});
router.delete('/conversations/:id', (req, res) => {
  db.conversations = db.conversations.filter((c) => c.id !== req.params.id);
  save();
  envelope(res, null);
});
router.delete('/conversations', (_req, res) => {
  db.conversations = [];
  save();
  envelope(res, null);
});
router.get('/knowledge', (_req, res) =>
  envelope(res, {
    bases: db.bases,
    documents: db.documents.map(({ text: _text, ...d }) => ({ ...d, text: '' })),
  }),
);
router.post('/knowledge', (req, res) => {
  const { name } = nameSchema.parse(req.body);
  const base = {
    id: crypto.randomUUID(),
    name,
    description: 'Your document collection',
    createdAt: new Date().toISOString(),
    documentCount: 0,
    chunkCount: 0,
    embeddingStatus: 'PENDING' as const,
  };
  db.bases.push(base);
  save();
  envelope(res, base, 201);
});
router.patch('/knowledge/:id', (req, res) => {
  const base = db.bases.find((b) => b.id === req.params.id);
  if (!base) throw new AppError(404, 'NOT_FOUND', 'Knowledge base not found.');
  base.name = nameSchema.parse(req.body).name;
  save();
  envelope(res, base);
});
router.delete('/knowledge/:id', (req, res) => {
  db.bases = db.bases.filter((b) => b.id !== req.params.id);
  db.documents = db.documents.filter((d) => d.knowledgeBaseId !== req.params.id);
  db.chunks = db.chunks.filter((c) => c.knowledgeBaseId !== req.params.id);
  save();
  envelope(res, null);
});
router.post('/knowledge/upload', upload.single('file'), (req, res) => {
  const id = z.string().parse(req.body.knowledgeBaseId);
  if (!db.bases.some((b) => b.id === id))
    throw new AppError(404, 'NOT_FOUND', 'Knowledge base not found.');
  const file = req.file;
  if (!file) throw new AppError(400, 'FILE_REQUIRED', 'Choose a file to upload.');
  const extension = file.originalname.split('.').at(-1)?.toUpperCase();
  if (!['PDF', 'TXT', 'MD'].includes(extension || ''))
    throw new AppError(400, 'FILE_TYPE', 'Only PDF, TXT and MD files are supported.');
  const name = Array.from(file.originalname)
    .map((char) => (char.charCodeAt(0) < 32 || char === '/' || char === '\\' ? '_' : char))
    .join('')
    .slice(0, 180);
  const doc = {
    id: crypto.randomUUID(),
    knowledgeBaseId: id,
    name,
    type: extension as 'PDF' | 'TXT' | 'MD',
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: 'PENDING' as const,
    embeddingStatus: 'PENDING' as const,
    chunkCount: 0,
    mock: true,
    text:
      extension === 'PDF'
        ? `Mock PDF excerpt for ${name}. PDF extraction is simulated in this portfolio. Use TXT or MD to search your actual uploaded text. The document lifecycle demonstrates parsing, chunking and embedding status transitions.`
        : file.buffer.toString('utf8'),
  };
  db.documents.push(doc);
  refreshBase(id);
  save();
  void processDocument(doc.id);
  envelope(res, { ...doc, text: '' }, 201);
});
router.post('/knowledge/documents/:id/retry', (req, res) => {
  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) throw new AppError(404, 'NOT_FOUND', 'Document not found.');
  doc.status = 'PENDING';
  doc.embeddingStatus = 'PENDING';
  delete doc.error;
  save();
  void processDocument(doc.id);
  envelope(res, { ...doc, text: '' });
});
router.delete('/knowledge/documents/:id', (req, res) => {
  const doc = db.documents.find((d) => d.id === req.params.id);
  db.documents = db.documents.filter((d) => d.id !== req.params.id);
  db.chunks = db.chunks.filter((c) => c.documentId !== req.params.id);
  if (doc) refreshBase(doc.knowledgeBaseId);
  save();
  envelope(res, null);
});
router.post('/knowledge/search', async (req, res) => {
  const start = Date.now();
  const data = z
    .object({
      query: z.string().trim().min(1).max(2000),
      knowledgeBaseId: z.string(),
      topK: z.number().int().min(1).max(10),
      threshold: z.number().min(0).max(1),
    })
    .parse(req.body);
  if (!db.bases.some((b) => b.id === data.knowledgeBaseId))
    throw new AppError(404, 'NOT_FOUND', 'Knowledge base not found.');
  await delay(300);
  const results = searchKnowledge(data.query, data.knowledgeBaseId, data.topK, data.threshold);
  record({
    kind: 'retrieval',
    model: 'lexical-demo',
    success: true,
    aborted: false,
    mock: true,
    tokens: 0,
    latencyMs: Date.now() - start,
  });
  envelope(res, {
    results,
    latencyMs: Date.now() - start,
    method: 'Mock lexical overlap (not vector similarity)',
  });
});
router.get('/tools', (_req, res) => envelope(res, tools));
router.post('/tools/execute', async (req, res) => {
  const start = Date.now();
  const data = z
    .object({
      name: z.string(),
      arguments: z.record(z.string(), z.unknown()),
      simulateFailure: z.boolean().optional(),
    })
    .parse(req.body);
  await delay(500);
  try {
    if (data.simulateFailure)
      throw new AppError(503, 'TOOL_FAILED', 'Simulated tool execution failure.');
    const result = executeTool(data.name, data.arguments);
    record({
      kind: 'tool',
      model: 'tool-router',
      tool: data.name,
      success: true,
      aborted: false,
      mock: result.mock,
      tokens: 0,
      latencyMs: Date.now() - start,
    });
    envelope(res, {
      id: crypto.randomUUID(),
      name: data.name,
      arguments: data.arguments,
      status: 'SUCCESS',
      result,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    record({
      kind: 'tool',
      model: 'tool-router',
      tool: data.name,
      success: false,
      aborted: false,
      mock: data.name !== 'calculate',
      tokens: 0,
      latencyMs: Date.now() - start,
    });
    throw error;
  }
});
router.get('/prompts', (_req, res) => envelope(res, db.prompts));
router.post('/prompts', (req, res) => {
  const input = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(100),
      systemPrompt: z.string().max(16000),
      userTemplate: z.string().min(1).max(16000),
      variables: z.record(z.string(), z.string().max(4000)),
      fewShots: z
        .array(z.object({ user: z.string().max(8000), assistant: z.string().max(8000) }))
        .max(10),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().int().min(16).max(8192),
      topP: z.number().min(0).max(1),
      saveVersion: z.boolean().optional(),
    })
    .parse(req.body);
  const existing = db.prompts.find((p) => p.id === input.id);
  const { saveVersion, ...fields } = input;
  const prompt = {
    ...fields,
    id: existing?.id || crypto.randomUUID(),
    versions: existing?.versions || [],
    updatedAt: new Date().toISOString(),
  };
  if (saveVersion) {
    const { versions: _versions, ...snapshot } = prompt;
    prompt.versions = [
      ...prompt.versions,
      { version: prompt.versions.length + 1, savedAt: prompt.updatedAt, snapshot },
    ];
  }
  if (existing) db.prompts.splice(db.prompts.indexOf(existing), 1, prompt);
  else db.prompts.push(prompt);
  save();
  envelope(res, prompt);
});
router.delete('/prompts/:id', (req, res) => {
  db.prompts = db.prompts.filter((p) => p.id !== req.params.id);
  save();
  envelope(res, null);
});
router.get('/metrics', (req, res) => {
  const params = z
    .object({
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
      samples: z.enum(['true', 'false']).optional(),
    })
    .parse(req.query);
  const records = db.records.filter(
    (r) =>
      (!params.from || r.timestamp.slice(0, 10) >= params.from) &&
      (!params.to || r.timestamp.slice(0, 10) <= params.to) &&
      (params.samples !== 'false' || !r.id.startsWith('sample-')),
  );
  envelope(res, {
    records,
    totalRequests: records.length,
    successRate: records.length
      ? (records.filter((r) => r.success).length / records.length) * 100
      : 0,
    avgLatency: records.length ? records.reduce((s, r) => s + r.latencyMs, 0) / records.length : 0,
    totalTokens: records.reduce((s, r) => s + r.tokens, 0),
    errorCount: records.filter((r) => !r.success && !r.aborted).length,
    source:
      params.samples === 'false'
        ? 'Locally observed requests'
        : 'Synthetic baseline + locally observed requests',
  });
});
export default router;
