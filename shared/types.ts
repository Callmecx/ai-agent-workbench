export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
export type RequestState = 'IDLE' | 'SUBMITTING' | 'STREAMING' | 'SUCCESS' | 'ERROR' | 'ABORTED';
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimated: boolean;
}
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  usage?: TokenUsage;
  latencyMs?: number;
  model?: string;
  status?: RequestState;
  toolCallId?: string;
}
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
export interface AIModel {
  id: string;
  name: string;
  family: 'GPT-style' | 'Claude-style' | 'Local' | 'Mock';
  available: boolean;
  contextWindow: number;
  description: string;
}
export interface ChatRequest {
  messages: Message[];
  model: string;
  mode: 'mock' | 'real';
  temperature: number;
  maxTokens: number;
  contextLength: number;
  topP: number;
  timeoutMs: number;
  simulate?: 'error' | 'timeout';
}
export interface ChatResponse {
  content: string;
  usage: TokenUsage;
  latencyMs: number;
  model: string;
}
export type StreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; data: ChatResponse }
  | { type: 'error'; error: APIError };
export type DocumentStatus = 'PENDING' | 'PARSING' | 'EMBEDDING' | 'READY' | 'FAILED';
export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  name: string;
  type: 'PDF' | 'TXT' | 'MD';
  size: number;
  uploadedAt: string;
  status: DocumentStatus;
  chunkCount: number;
  embeddingStatus: DocumentStatus;
  error?: string;
  text: string;
  mock: boolean;
}
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  documentCount: number;
  chunkCount: number;
  embeddingStatus: DocumentStatus;
}
export interface Chunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  text: string;
  metadata: { source: string; index: number; characters: number; mock: boolean };
}
export interface RetrievalResult {
  rank: number;
  score: number;
  chunk: Chunk;
  sourceDocument: string;
}
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, string>;
  mock: boolean;
}
export interface ToolResult {
  output: Record<string, unknown>;
  mock: boolean;
}
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  durationMs: number;
  result?: ToolResult;
  error?: string;
}
export interface PromptVersion {
  version: number;
  savedAt: string;
  snapshot: Omit<PromptTemplate, 'versions'>;
}
export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  userTemplate: string;
  variables: Record<string, string>;
  fewShots: { user: string; assistant: string }[];
  temperature: number;
  maxTokens: number;
  topP: number;
  versions: PromptVersion[];
  updatedAt: string;
}
export interface MetricRecord {
  id: string;
  timestamp: string;
  kind: 'chat' | 'tool' | 'retrieval';
  model: string;
  success: boolean;
  aborted: boolean;
  latencyMs: number;
  tokens: number;
  mock: boolean;
  tool?: string;
}
export interface Metrics {
  records: MetricRecord[];
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalTokens: number;
  errorCount: number;
  source: string;
}
export interface APIError {
  code: string;
  message: string;
  requestId?: string;
}
export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: APIError | null;
  requestId: string;
}
export interface Health {
  status: string;
  realConfigured: boolean;
  providerBaseUrl: string;
  authenticationRequired: boolean;
}
