import { api, unwrap } from '../api/client';
import type { ToolCall, ToolDefinition } from '../types';
export const toolsService = { list: (signal?: AbortSignal) => unwrap<ToolDefinition[]>(api.get('/tools', { signal })), execute: (name: string, args: Record<string, unknown>, simulateFailure: boolean, signal: AbortSignal) => unwrap<ToolCall>(api.post('/tools/execute', { name, arguments: args, simulateFailure }, { signal })) };
