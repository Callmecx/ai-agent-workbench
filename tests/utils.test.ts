import { describe, expect, it } from 'vitest';
import { selectContext, renderTemplate } from '../src/utils/context';
import { transition } from '../src/utils/state';
import { routeTool } from '../src/utils/toolRouting';
import { readSSE } from '../shared/sse';
import type { Message } from '../shared/types';
const msg = (role: Message['role'], content: string, status?: Message['status']): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
  status,
});
describe('context budgeting', () => {
  it('keeps the system prompt and latest complete turn, removing oldest turns first', () => {
    const system = msg('system', 'instructions');
    const history = [
      system,
      msg('user', 'a'.repeat(300)),
      msg('assistant', 'b'.repeat(300)),
      msg('user', 'current question'),
    ];
    expect(selectContext(history, 150, 40)).toEqual([system, history[3]]);
  });
  it('rejects a latest message that cannot fit instead of silently dropping it', () => {
    expect(() => selectContext([msg('user', 'x'.repeat(2000))], 512, 100)).toThrow(
      /latest message/,
    );
  });
  it('excludes failed or aborted assistant output from future context', () => {
    const user = msg('user', 'hi');
    expect(selectContext([user, msg('assistant', 'partial', 'ABORTED')], 512, 16)).toEqual([user]);
  });
});
describe('prompt interpolation', () => {
  it('renders repeated variables without interpreting their content', () => {
    expect(renderTemplate('{{topic}} / {{ topic }}', { topic: '<script>test</script>' })).toBe(
      '<script>test</script> / <script>test</script>',
    );
  });
  it('rejects missing variables', () =>
    expect(() => renderTemplate('{{missing}}', {})).toThrow('required'));
});
describe('request state machine', () => {
  it('models streaming cancellation and retry', () => {
    let state = transition('IDLE', 'SUBMITTING');
    state = transition(state, 'STREAMING');
    state = transition(state, 'ABORTED');
    expect(transition(state, 'SUBMITTING')).toBe('SUBMITTING');
  });
  it('rejects impossible transitions', () =>
    expect(() => transition('IDLE', 'SUCCESS')).toThrow('Invalid request transition'));
});
describe('SSE parser', () => {
  it('handles UTF-8 and boundaries split across arbitrary network chunks', async () => {
    const bytes = new TextEncoder().encode('data: {"text":"你好"}\r\n\r\ndata: [DONE]\n\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const frames = [];
    for await (const frame of readSSE(body)) frames.push(frame);
    expect(frames).toEqual(['{"text":"你好"}', '[DONE]']);
  });
});
describe('demo tool routing', () => {
  it('routes Chinese market requests and calculation inputs', () => {
    expect(routeTool('查询 BTC 当前市场情况').name).toBe('get_market_data');
    expect(routeTool('calculate (3 + 4) * 2').arguments).toEqual({ expression: '(3 + 4) * 2' });
  });
});
