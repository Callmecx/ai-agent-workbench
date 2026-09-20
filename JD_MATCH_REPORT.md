# JD Match Report

目标岗位：AI 大模型前端开发工程师。完成度描述功能边界，不使用虚构百分比。测试结果见 `docs/ACCEPTANCE_REPORT.md`。

| JD 能力            | 项目实现                                                 | 证据文件                                                                              | 完成度                | 说明                                               |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------- |
| Vue 3 / TypeScript | Composition API、strict 类型、路由懒加载                 | `src/views/`, `tsconfig.json`, `src/router/index.ts`                                  | 已实现                | 七个功能页面，非静态展示                           |
| LLM 多轮对话       | system/user/assistant/tool 类型、历史、重复提交保护      | `shared/types.ts`, `src/composables/useChat.ts`                                       | 已实现交互与接口      | 默认回答是 Mock，Real adapter 可配置               |
| Streaming          | Fetch ReadableStream + SSE、增量解码、停止/错误/终止检测 | `shared/sse.ts`, `src/composables/useStreaming.ts`, `server/controllers/chat.ts`      | 已实现并测试          | 真实 HTTP 分块；供应商实测未执行                   |
| Prompt             | 模板、变量、few-shot、版本快照与测试                     | `src/views/PromptsView.vue`, `src/utils/context.ts`                                   | 已实现                | JSON 本地持久化，非多人版本控制                    |
| Context            | 按完整轮次裁剪、保留 system、输出预留                    | `src/utils/context.ts`, `server/controllers/chat.ts`                                  | 已实现基础策略        | 使用字符启发式，非供应商精确 tokenizer             |
| Token              | provider usage、估算标签、会话和监控累计                 | `server/providers/`, `src/composables/useTokenUsage.ts`                               | 已实现                | 不声称等于付费账单                                 |
| 防抖               | 输入字符统计 180ms 防抖                                  | `src/views/ChatView.vue`                                                              | 已实现                | 防抖不代替同步提交锁                               |
| 限流               | Express 单 IP 请求限流、统一 429                         | `server/app.ts`                                                                       | 已实现基础能力        | 内存存储，非多节点共享配额                         |
| RAG UI             | 文档生命周期、chunk、rank、score、metadata、sources      | `src/views/KnowledgeView.vue`, `src/views/RetrievalView.vue`                          | 已实现                | UI 与数据链路完整                                  |
| RAG 真实检索       | TXT/MD 读取、分块、词法搜索                              | `server/services/knowledge.ts`                                                        | 部分实现              | PDF/Embedding 模拟，无向量库/reranker/召回质量评测 |
| Agent              | 请求到工具结果的可视化执行链                             | `src/views/ToolsView.vue`, `src/utils/toolRouting.ts`                                 | 演示实现              | 规则路由和确定性总结，不是自主模型 Agent           |
| Function Calling   | 工具白名单、Zod 参数校验、执行与失败展示                 | `server/services/tools.ts`, `server/routes/index.ts`                                  | 部分实现              | 无真实 LLM tools protocol round-trip               |
| Node.js            | Express REST / SSE BFF                                   | `server/app.ts`, `server/routes/index.ts`                                             | 已实现                | 单进程本地服务                                     |
| AI API             | OpenAI-compatible `/chat/completions` 转发、usage、重试  | `server/providers/OpenAICompatibleProvider.ts`, `tests/server.test.ts`                | 已实现且 fixture 验证 | 没有真实厂商 Key 的端到端付费验证                  |
| 中间层             | 统一协议、Request ID、日志、错误、超时、取消             | `server/middleware/http.ts`, `server/controllers/chat.ts`                             | 已实现                | 日志不含 Prompt/Key                                |
| 请求鉴权           | 可选 BFF Bearer Token、恒时比较、上游 server Key         | `server/middleware/http.ts`, `src/api/client.ts`                                      | 基础实现              | 不是用户账户、OAuth、RBAC 或租户隔离               |
| 成本控制           | Max Tokens、Context budget、model allowlist、rate limit  | `src/components/ModelParameters.vue`, `server/controllers/chat.ts`, `server/app.ts`   | 部分实现              | 无金额价格表、账单精度或日预算硬限制               |
| Web AI 体验        | 流式 Markdown、高亮、复制、停止、恢复、配置              | `src/components/MarkdownContent.vue`, `src/views/ChatView.vue`                        | 已实现                | 长文本上限，无虚拟列表                             |
| Metrics            | KPI、七类图表、日期范围、基线隔离                        | `src/views/MonitoringView.vue`, `src/utils/charts.ts`                                 | 已实现本地监控        | Synthetic baseline 可关闭，非生产性能数据          |
| 安全               | Key 隔离、白名单、校验、DOMPurify、安全算术              | `server/providers/`, `src/components/MarkdownContent.vue`, `server/services/tools.ts` | 已实现基础防护        | 本地明文数据，无生产安全认证                       |
| 工程化 / 测试      | Vitest、Playwright、ESLint、Prettier、构建脚本           | `tests/`, `e2e/`, `package.json`                                                      | 已实现并本地执行      | 并不等于跨浏览器、性能或渗透测试全部完成           |
| AI Coding          | Codex 辅助实现、测试、修复和材料                         | Git 历史、`docs/CODE_REVIEW.md`                                                       | 有可追溯交付          | 个人职责需据实际审查/验收经历表述                  |

## 面试中的诚实边界

可以说：“我实现了具备真实网络流、取消、异常恢复、RAG 证据 UI 和工具执行链的工作台，真实 AI 适配器在本地 fixture 中验证。”

不应说：“已上线生产 Agent”“实现真实语义 RAG”“所有模型都完成生产联调”“召回率/模型速度提升了某个百分比”。这些没有本项目证据支持。
