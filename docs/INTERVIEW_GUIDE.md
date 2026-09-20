# AI Agent Workbench · 面试展示指南

## 90 秒开场

“我把 AI 前端岗位要求拆成对话、Prompt、RAG、Agent 工具和可观测性五类工作流，用 Vue 3 和 Node BFF 做成一个可以本地运行的工作台。重点是可取消的真实 HTTP 流、明确状态、异常恢复、安全边界和可解释的证据。没有 API Key 时走同一条 BFF 链路的 Mock provider；有 Key 时可切换兼容 API。Embedding 和 Agent 自主决策仍然是演示，不会包装成生产能力。”

## 1. 我为什么做这个项目

AI 应用前端的难点在不确定性：流可能中断，返回可能很长，工具可能失败，答案可能缺少证据。项目目标是把这些问题做成可观察、可恢复的交互，而不是仅展示聊天样式。

## 2. 需求如何拆解

先定义共享类型和状态，再分为七个页面；BFF 统一 API 和 provider。先 Mock 打通全流程，再保留真实适配器，最后通过自动化测试和浏览器验收验证。

## 3. 前端架构为什么这样设计

View 负责布局，Composable 负责可复用请求生命周期，Store 按领域保存状态，Service 是唯一 API 入口。这样路由可以独立迭代，模型协议不会散落在组件里。

## 4. 为什么加 BFF

前端不能保管 provider Key。BFF 统一鉴权、限流、Zod 校验、模型白名单、超时、日志和 SSE 协议，并把上游差异隔离在 AIProvider 后面。

## 5. Streaming 如何实现

浏览器 POST + fetch ReadableStream，服务端 async generator 产生 delta/done，使用 SSE 信封输出。parser 跨网络分块维护 buffer，并增量解码 UTF-8。停止时 AbortController 向上游传播取消。

## 6. RAG 前端需要处理什么

文档状态、文件信息、Chunk 数量、错误和重试；检索参数、原始 chunk、score、来源、metadata；检索结果与模型回答独立展示。当前 TXT/MD 可实文搜索，Embedding/PDF 解析模拟。

## 7. Function Calling 怎么表现

显示工具名、JSON 参数、状态、时长、结果、错误和最终总结；不显示私有思维链。当前 router 是规则，计算器是真执行，其余工具为 mock 或本地词法检索；没有真正的模型自主工具循环。

## 8. 如何处理 Token

真实 provider usage 优先；否则明确显示 estimated。上下文按完整 user turn 裁剪，保留 system 和最新问题，并预留 maxTokens。估算不是账单或精确 tokenizer。

## 9. 如何处理 Timeout

前端有请求 deadline，BFF 使用更严格的上限；超时触发 AbortSignal，流返回结构化 TIMEOUT，UI 保留局部内容并提供 Retry。测试里真实等待短超时验证路径。

## 10. 如何防重复请求

useChat 的同步提交锁和 request state 阻止重复发送；新建/加载会话时禁用输入，避免消息进入旧会话。字符计数防抖是独立优化，不应拿防抖代替提交幂等。

## 11. 如何处理错误

HTTP 和 SSE 共享 APIError / requestId，Axios normalizeError 归一化错误。流开始前是 HTTP 错误，流开始后是 SSE error 帧；取消、超时与上游错误有不同 UI 状态。

## 12. 如何支持多模型

AIProvider 接口隔离实现；模型列表由服务端配置。GPT-style、Claude-style、Local 的 Mock profile 用来展示抽象，不伪称实现每家原生协议。

## 13. Mock Mode 与 Real Mode 区别

两者走相同 API / SSE。Mock 无推理服务费，逐块输出可重复响应。Real 由 BFF 转发 server/.env 配置的兼容服务；知识检索和 Agent router 不因模式切换变成真实 Embedding 或模型决策。

## 14. 哪些代码由 AI 辅助生成

本项目大量具体实现、样板、测试和文档由 Codex 辅助生成。本地执行了编译、Lint、接口测试、浏览器测试与修复。Git 记录可用于讲解每个模块的形成。面试时不应把尚未亲自理解的实现包装为独立手写成果。

## 15. 我本人负责什么

以下是项目负责人应承担的职责清单。**需求已由你提供；代码审查、亲自运行和最终验收需在你实际完成后才能作为个人已完成经历陈述。** 本文件不是替你证明未发生的活动。

我本人负责：产品需求定义、功能拆解、架构边界、数据结构设计、AI 任务拆解、代码审查、运行测试、Bug 定位、验收、迭代。

AI Coding 工具负责：大量具体代码实现、Boilerplate、重复代码、Debug 辅助、文档辅助。

推荐表述：“我定义产品和工程边界，用 AI 完成实现加速，并对关键代码、测试和验收结果负责。哪些部分亲自设计、修改或验证，我会结合具体文件说明。” 在面试前亲自阅读 `useStreaming.ts`、`chat.ts` controller、context 工具和安全算术 parser，并至少独立复现一次失败恢复。

## 最值得展示的五个功能（8 分钟）

1. **Chat（2 分钟）**：新对话 → 发送 → 流式输出 → Stop → Regenerate → 刷新保持历史。解释状态机与 Abort。
2. **异常恢复（1 分钟）**：配置 Simulate provider error → 发送 → 看到 requestId → Retry。解释 SSE 中的错误信封。
3. **知识与检索（2 分钟）**：上传 TXT/MD → 看状态变化 → Query → 原始 chunk → Generate Answer → Sources。主动说明词法分数和 Mock Embedding。
4. **Agent 工具（1 分钟）**：calculate `(128 + 64) * 3` → Arguments / Result / Duration → 模拟失败 → Retry。解释为什么不用 eval。
5. **Prompt + Monitoring（2 分钟）**：修改变量 → 保存版本 → 流式 Test → 切到 Monitoring 关闭 synthetic baseline，看实际本地请求。

## 20 个常见问题与简洁回答思路

| #   | 问题                                | 回答思路                                                                                           |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | 为什么不直接从浏览器调用 AI API？   | Key 会暴露，且很难统一限流、超时、协议和审计；BFF 承担边界。                                       |
| 2   | 为什么用 fetch 而不是 EventSource？ | 需要 POST JSON、Bearer 和 AbortSignal；仍使用 SSE framing。                                        |
| 3   | 流被拆在一个汉字中间怎么办？        | TextDecoder 的 stream 模式跨 chunk 保留不完整 UTF-8。                                              |
| 4   | Stop 真能停止上游吗？               | 浏览器中止连接，BFF close 事件取消 upstream fetch；供应商计费/停止语义仍依实现。                   |
| 5   | 如何防止旧请求覆盖新请求？          | useRequest 递增 generation，过期响应丢弃，发起新请求先取消旧请求。                                 |
| 6   | 为什么要状态机？                    | 消除互相矛盾的 loading/error/streaming 布尔组合，定义允许转换。                                    |
| 7   | Retry 和 Regenerate 有何区别？      | UI 入口不同，都重新生成最近问题；不重复追加 user 消息。                                            |
| 8   | 上下文如何裁剪？                    | 保留 system、最近完整轮次和最新问题，为输出预留预算，过大时明确报错。                              |
| 9   | Token 是否精确？                    | usage 精确到 provider 返回值；无 usage 时字符估算并标记 estimated。                                |
| 10  | 如何控制费用？                      | 白名单、maxTokens、context budget、限流、超时；尚无真实价格计费和账户硬预算。                      |
| 11  | RAG 的 score 代表什么？             | 当前是词法重叠，不是向量相似度；不能宣称语义召回准确率。                                           |
| 12  | 上传 PDF 是真实解析吗？             | 不是，目前模拟摘录；TXT/MD 读取的是实际文本。                                                      |
| 13  | 为什么区分检索与生成？              | 有助于定位是召回错、上下文错还是模型回答错，并让用户审查证据。                                     |
| 14  | 是否实现真实 Function Calling？     | 实现可观测执行链、受限工具和参数校验；路由/总结仍是 demo，不是 LLM 自主循环。                      |
| 15  | 如何避免计算工具执行任意代码？      | 递归下降 parser，仅允许数字和运算符；拒绝标识符、属性访问、非有限结果。                            |
| 16  | Markdown 如何防 XSS？               | 禁用 raw HTML，DOMPurify 二次过滤，不执行用户 Vue 模板；测试覆盖恶意 HTML/URL。                    |
| 17  | 如何避免内存泄漏？                  | 轮询、deadline 和请求清理；ResizeObserver disconnect；ECharts dispose。                            |
| 18  | 为什么不用数据库或微服务？          | 单用户作品用单进程 JSON 足够；先证明边界和工作流，多人/高并发再引入存储事务。                      |
| 19  | 测试覆盖了什么？                    | 工具/上下文/状态机/XSS/Store/错误，以及 BFF 真 HTTP SSE 和七页面浏览器流程。                       |
| 20  | AI 写代码之后你的价值是什么？       | 需求取舍、架构边界、识别伪能力、审查风险、设计验证、定位和解释具体问题；结合真实承担过的工作回答。 |

## 演示前检查

运行 `npm run dev:all`，确认 API connected 与 Mock mode。亲自试一次 Stop/Retry。使用随库种子或自己的非敏感 TXT。不要在演示屏幕上打开含真实 Key 的 server/.env。
