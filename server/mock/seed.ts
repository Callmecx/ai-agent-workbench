import type {
  AIModel,
  Chunk,
  Conversation,
  KnowledgeBase,
  KnowledgeDocument,
  MetricRecord,
  PromptTemplate,
  ToolDefinition,
} from '../../shared/types.js';
const now = new Date().toISOString();
export const mockModels: AIModel[] = [
  {
    id: 'workbench-mock',
    name: 'Workbench Mock',
    family: 'Mock',
    available: true,
    contextWindow: 16000,
    description: 'Deterministic streaming demonstration; no external API.',
  },
  {
    id: 'gpt-style-demo',
    name: 'GPT-style adapter',
    family: 'GPT-style',
    available: true,
    contextWindow: 16000,
    description: 'Mock profile. Real model IDs come from server configuration.',
  },
  {
    id: 'claude-style-demo',
    name: 'Claude-style adapter',
    family: 'Claude-style',
    available: true,
    contextWindow: 16000,
    description: 'Mock profile only; no native Anthropic API integration.',
  },
  {
    id: 'local-demo',
    name: 'Local model adapter',
    family: 'Local',
    available: true,
    contextWindow: 16000,
    description: 'Mock profile; a real local compatible endpoint can be configured on the server.',
  },
];
export const tools: ToolDefinition[] = [
  {
    name: 'get_market_data',
    description: 'Inspect a sample market snapshot. Prices are fictional.',
    parameters: { symbol: 'BTC', interval: '24h' },
    mock: true,
  },
  {
    name: 'search_knowledge',
    description: 'Search local document chunks using demo lexical scoring.',
    parameters: { query: 'retrieval', top_k: '3' },
    mock: true,
  },
  {
    name: 'calculate',
    description: 'Evaluate arithmetic safely, without eval or code execution.',
    parameters: { expression: '(128 + 64) * 3' },
    mock: false,
  },
  {
    name: 'get_weather',
    description: 'Return a fictional weather fixture for a city.',
    parameters: { city: 'Shanghai' },
    mock: true,
  },
];
export function createSeed() {
  const bases: KnowledgeBase[] = [
    {
      id: 'kb-product',
      name: 'Product handbook',
      description: 'Architecture, onboarding and product decisions.',
      createdAt: now,
      documentCount: 2,
      chunkCount: 3,
      embeddingStatus: 'READY',
    },
    {
      id: 'kb-research',
      name: 'Research library',
      description: 'A space for papers, notes and experiments.',
      createdAt: now,
      documentCount: 0,
      chunkCount: 0,
      embeddingStatus: 'PENDING',
    },
  ];
  const documents: KnowledgeDocument[] = [
    {
      id: 'doc-architecture',
      knowledgeBaseId: 'kb-product',
      name: 'workbench-architecture.md',
      type: 'MD',
      size: 2480,
      uploadedAt: now,
      status: 'READY',
      chunkCount: 2,
      embeddingStatus: 'READY',
      text: 'AI Agent Workbench uses Vue 3 and a Node.js BFF. The BFF protects API keys and normalizes streaming responses. Retrieval uses document chunks, scores and explicit citations. Mock embedding is a lifecycle simulation, not a vector embedding service.',
      mock: true,
    },
    {
      id: 'doc-guide',
      knowledgeBaseId: 'kb-product',
      name: 'retrieval-guide.txt',
      type: 'TXT',
      size: 1320,
      uploadedAt: now,
      status: 'READY',
      chunkCount: 1,
      embeddingStatus: 'READY',
      text: 'Retrieval augmented generation (RAG) retrieves relevant document chunks before generating an answer. Top K limits the number of chunks. Score threshold filters weak matches. Sources must stay attached to the generated answer.',
      mock: true,
    },
  ];
  const chunks: Chunk[] = [
    {
      id: 'chunk_0001',
      documentId: 'doc-architecture',
      knowledgeBaseId: 'kb-product',
      text: 'AI Agent Workbench uses Vue 3, TypeScript, Pinia and a Node.js BFF. The BFF keeps API keys on the server, forwards streaming responses and applies request timeouts and rate limits.',
      metadata: { source: 'workbench-architecture.md', index: 0, characters: 202, mock: true },
    },
    {
      id: 'chunk_0002',
      documentId: 'doc-architecture',
      knowledgeBaseId: 'kb-product',
      text: 'The knowledge pipeline progresses through pending, parsing, embedding and ready. Mock Mode simulates embedding and uses lexical scoring for retrieval; it does not evaluate semantic recall quality.',
      metadata: { source: 'workbench-architecture.md', index: 1, characters: 190, mock: true },
    },
    {
      id: 'chunk_0003',
      documentId: 'doc-guide',
      knowledgeBaseId: 'kb-product',
      text: documents[1]!.text,
      metadata: {
        source: 'retrieval-guide.txt',
        index: 0,
        characters: documents[1]!.text.length,
        mock: true,
      },
    },
  ];
  const conversations: Conversation[] = [
    {
      id: 'welcome',
      title: 'Designing a grounded AI assistant',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: 'welcome-system',
          role: 'system',
          content:
            'You are a helpful product engineering assistant. Clearly distinguish demonstrated behavior from production capabilities.',
          createdAt: now,
        },
        {
          id: 'welcome-user',
          role: 'user',
          content: 'How should we build a reliable RAG workflow?',
          createdAt: now,
        },
        {
          id: 'welcome-assistant',
          role: 'assistant',
          content:
            '## Give every answer a source\n\nA reliable RAG workflow makes the evidence visible, from document ingestion to the final response.\n\n1. **Prepare your knowledge** — parse documents into traceable chunks.\n2. **Inspect retrieval** — tune Top K and score thresholds before generation.\n3. **Generate with context** — pass selected chunks to the model and display citations.\n\n> Start with observable behavior. Improve retrieval quality only after you can explain where an answer came from.\n\n```typescript\nconst context = results.map(({ chunk }) => chunk.text);\nconst answer = await generate({ question, context });\n```\n\nThis is a **sample conversation**. In this workbench, embeddings and AI responses are simulated until a real provider is configured.',
          createdAt: now,
          model: 'workbench-mock',
          status: 'SUCCESS',
          latencyMs: 1240,
          usage: { promptTokens: 42, completionTokens: 168, totalTokens: 210, estimated: true },
        },
      ],
    },
  ];
  const prompts: PromptTemplate[] = [
    'Research Analyst',
    'Customer Support',
    'Data Analyst',
    'Crypto Research',
  ].map((name, i) => ({
    id: `prompt-${i}`,
    name,
    systemPrompt: `You are a ${name.toLowerCase()}. Be precise, explain uncertainty and distinguish evidence from assumptions.`,
    userTemplate:
      'Help me understand {{topic}}. Respond in {{language}} with a structured explanation.',
    variables: {
      topic: i === 3 ? 'BTC market risks' : 'retrieval augmented generation',
      language: 'English',
    },
    fewShots: [
      {
        user: 'What makes an answer reliable?',
        assistant: 'Traceable evidence, explicit assumptions and calibrated uncertainty.',
      },
    ],
    temperature: 0.7,
    maxTokens: 1024,
    topP: 1,
    versions: [],
    updatedAt: now,
  }));
  const records: MetricRecord[] = [];
  // Transparent synthetic baseline, labeled separately from locally observed requests.
  for (let day = 13; day >= 0; day--)
    for (let j = 0; j < 8 + ((day * 7) % 14); j++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(8 + (j % 12), 15, 0, 0);
      records.push({
        id: `sample-${day}-${j}`,
        timestamp: date.toISOString(),
        kind: j % 5 === 0 ? 'tool' : j % 4 === 0 ? 'retrieval' : 'chat',
        model: j % 3 === 0 ? 'gpt-style-demo' : 'workbench-mock',
        success: (day + j) % 19 !== 0,
        aborted: false,
        latencyMs: 430 + ((day * 89 + j * 137) % 1900),
        tokens: 180 + ((day * 53 + j * 61) % 1200),
        mock: true,
        tool: j % 5 === 0 ? tools[j % 4]!.name : undefined,
      });
    }
  return { bases, documents, chunks, conversations, prompts, records };
}
