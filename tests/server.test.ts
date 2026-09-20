import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import type { Express } from 'express';
import type { ChatRequest } from '../shared/types';
let app: Express;
let fixture: Server;
let calculate: (expression: string) => number;
let temp: string;
const chatInput: ChatRequest = {
  messages: [{ id: 'm1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() }],
  model: 'workbench-mock',
  mode: 'mock',
  temperature: 0.7,
  maxTokens: 32,
  contextLength: 4096,
  topP: 1,
  timeoutMs: 5000,
};
beforeAll(async () => {
  temp = mkdtempSync(join(tmpdir(), 'workbench-tests-'));
  process.env.DATA_FILE = join(temp, 'db.json');
  process.env.NODE_ENV = 'test';
  process.env.BFF_ACCESS_TOKEN = 'test-access-token';
  process.env.RATE_LIMIT_PER_MINUTE = '200';
  fixture = createServer(async (req, res) => {
    if (req.headers.authorization !== 'Bearer fixture-secret') {
      res.writeHead(401).end();
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body) as { model: string };
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('data: {"choices":[{"delta":{"content":"Hello from fixture"}}]}\n\n');
    if (input.model !== 'truncated-fixture') {
      res.write(
        'data: {"choices":[],"usage":{"prompt_tokens":7,"completion_tokens":4,"total_tokens":11}}\n\n',
      );
      res.write('data: [DONE]\n\n');
    }
    res.end();
  });
  await new Promise<void>((resolve) => fixture.listen(0, '127.0.0.1', resolve));
  process.env.AI_API_BASE_URL = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}/v1`;
  process.env.AI_API_KEY = 'fixture-secret';
  process.env.ALLOW_REAL_API = 'true';
  process.env.AI_MODELS = 'fixture-model,truncated-fixture';
  app = (await import('../server/app')).app;
  calculate = (await import('../server/services/tools')).calculate;
});
afterAll(async () => {
  await new Promise<void>((resolve) => fixture.close(() => resolve()));
  rmSync(temp, { recursive: true, force: true });
});
const auth = { Authorization: 'Bearer test-access-token' };
describe('BFF boundary', () => {
  it('returns health envelopes without secrets', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requestId).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('fixture-secret');
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });
  it('requires configured bearer authentication', async () => {
    const res = await request(app).get('/api/models');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
  it('validates malformed input without leaking internal exceptions', async () => {
    const res = await request(app).post('/api/chat').set(auth).send({ messages: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('streams mock chunks and terminal usage', async () => {
    const res = await request(app).post('/api/chat').set(auth).send(chatInput);
    expect(res.headers['content-type']).toContain('text/event-stream');
    const events = res.text
      .split('\n\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line.slice(6)));
    expect(events.filter((e) => e.data?.type === 'delta').length).toBeGreaterThan(1);
    expect(events.at(-1).data.data.usage.estimated).toBe(true);
  });
  it('normalizes provider failures and timeouts inside SSE', async () => {
    const failure = await request(app)
      .post('/api/chat')
      .set(auth)
      .send({ ...chatInput, simulate: 'error' });
    expect(failure.text).toContain('MOCK_ERROR');
    const timeout = await request(app)
      .post('/api/chat')
      .set(auth)
      .send({ ...chatInput, simulate: 'timeout', timeoutMs: 1000 });
    expect(timeout.text).toContain('TIMEOUT');
  });
  it('forwards real-compatible streams using only server credentials', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set(auth)
      .send({ ...chatInput, model: 'fixture-model', mode: 'real' });
    expect(res.text).toContain('Hello from fixture');
    expect(res.text).toContain('"estimated":false');
    expect(res.text).not.toContain('fixture-secret');
  });
  it('rejects a truncated upstream stream', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set(auth)
      .send({ ...chatInput, model: 'truncated-fixture', mode: 'real' });
    expect(res.text).toContain('INCOMPLETE_STREAM');
  });
  it('rejects unapproved real models', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set(auth)
      .send({ ...chatInput, model: 'unapproved', mode: 'real' });
    expect(res.text).toContain('INVALID_MODEL');
  });
});
describe('data workflows', () => {
  it('persists conversation create update delete', async () => {
    const created = await request(app).post('/api/conversations').set(auth).send({ title: 'Test' });
    const id = created.body.data.id;
    await request(app)
      .put(`/api/conversations/${id}`)
      .set(auth)
      .send({ title: 'Updated', messages: chatInput.messages })
      .expect(200);
    const list = await request(app).get('/api/conversations').set(auth);
    expect(list.body.data.find((c: { id: string }) => c.id === id).messages).toHaveLength(1);
    await request(app).delete(`/api/conversations/${id}`).set(auth).expect(200);
  });
  it('uploads actual text, indexes it and retrieves matching chunks', async () => {
    const created = await request(app)
      .post('/api/knowledge')
      .set(auth)
      .send({ name: 'Test corpus' });
    const id = created.body.data.id;
    const uploaded = await request(app)
      .post('/api/knowledge/upload')
      .set(auth)
      .field('knowledgeBaseId', id)
      .attach(
        'file',
        Buffer.from('Cobalt testing token. This document describes streaming cancellation.'),
        'notes.md',
      );
    expect(uploaded.status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 2700));
    const search = await request(app)
      .post('/api/knowledge/search')
      .set(auth)
      .send({ knowledgeBaseId: id, query: 'Cobalt', topK: 3, threshold: 0.1 });
    expect(search.body.data.results[0].chunk.text).toContain('Cobalt');
    await request(app).delete(`/api/knowledge/${id}`).set(auth).expect(200);
  });
  it('rejects unsupported uploads', async () => {
    const res = await request(app)
      .post('/api/knowledge/upload')
      .set(auth)
      .field('knowledgeBaseId', 'kb-product')
      .attach('file', Buffer.from('test'), 'script.exe');
    expect(res.status).toBe(400);
  });
  it('saves immutable prompt versions', async () => {
    const prompts = await request(app).get('/api/prompts').set(auth);
    const prompt = prompts.body.data[0];
    const saved = await request(app)
      .post('/api/prompts')
      .set(auth)
      .send({ ...prompt, saveVersion: true });
    expect(saved.body.data.versions[0].snapshot.name).toBe(prompt.name);
    const changed = await request(app)
      .post('/api/prompts')
      .set(auth)
      .send({ ...prompt, name: 'Changed', saveVersion: false });
    expect(changed.body.data.versions[0].snapshot.name).toBe(prompt.name);
  });
});
describe('safe tool execution', () => {
  it('respects precedence, unary operators and parentheses', () => {
    expect(calculate('(128 + 64) * 3')).toBe(576);
    expect(calculate('-3 + 8 / 2')).toBe(1);
  });
  it.each(['process.exit()', '1 / 0', '1 2', '(3 + 4', '2 ** 4'])(
    'rejects unsafe or invalid arithmetic: %s',
    (expression) => expect(() => calculate(expression)).toThrow(),
  );
  it('returns tool results and normalizes failures', async () => {
    const result = await request(app)
      .post('/api/tools/execute')
      .set(auth)
      .send({ name: 'calculate', arguments: { expression: '2 * 21' } });
    expect(result.body.data.result.output.value).toBe(42);
    const failed = await request(app)
      .post('/api/tools/execute')
      .set(auth)
      .send({ name: 'calculate', arguments: { expression: '1' }, simulateFailure: true });
    expect(failed.body.error.code).toBe('TOOL_FAILED');
  });
});
