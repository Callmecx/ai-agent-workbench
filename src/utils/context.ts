import type { Message } from '../types';
export const estimateTokens = (text: string) => Math.ceil(text.length / 3);
export function selectContext(messages: Message[], contextLength: number, maxTokens: number): Message[] {
  const budget = contextLength - maxTokens;
  const system = messages.filter((m) => m.role === 'system');
  let used = system.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
  const history = messages.filter((m) => m.role !== 'system' && m.content && m.status !== 'ERROR' && m.status !== 'ABORTED');
  const groups: Message[][] = [];
  for (const message of history) { if (message.role === 'user' || groups.length === 0) groups.push([]); groups.at(-1)!.push(message); }
  const selected: Message[] = [];
  for (let i = groups.length - 1; i >= 0; i--) { const group = groups[i]!; const size = group.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0); if (used + size > budget) { if (!selected.length) throw new Error('Your latest message and system prompt exceed the context budget. Increase Context Length or lower Max Tokens.'); break; } selected.unshift(...group); used += size; }
  if (used > budget) throw new Error('System prompt exceeds the context budget.');
  return [...system, ...selected];
}
export function renderTemplate(template: string, variables: Record<string, string>): string { return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key: string) => { if (!(key in variables) || !variables[key]?.trim()) throw new Error(`Variable "${key}" is required.`); return variables[key]!; }); }
export const formatNumber = (number: number) => new Intl.NumberFormat('en', { notation: number >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(number);
export const formatDate = (value: string) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
