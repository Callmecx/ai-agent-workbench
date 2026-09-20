# Senior Frontend Code Review

审查对象：Vue 3 / TypeScript 前端、Express BFF、状态和资源生命周期、接口安全、构建及测试。此文记录实际发现和修复，不是生产安全认证。

## 已发现并修复

| 问题                               | 风险                                               | 修复 / 证据                                                                    |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| 新建会话请求与输入提交竞态         | 消息可能进入旧会话，再被新会话 UI 遮住             | 创建/加载期间禁用输入与操作，useChat 同步锁；`e2e/workbench.spec.ts` Chat 测试 |
| Store 返回原始会话对象             | 数组中的代理与后续 raw mutation 导致流式 UI 不更新 | create 返回 active 的响应式代理；`src/stores/chatStore.ts`                     |
| 无输出超时后刷新缺少恢复入口       | 空 assistant 既显示等待又无法 Regenerate           | 等待态只在 SUBMITTING/STREAMING；空 assistant 也保留恢复按钮；超时浏览器测试   |
| 卸载后旧 Chat 请求写入全局状态     | 快速切路由时旧请求可能覆盖新视图状态               | disposed guard、卸载 abort、仅持久化原会话，阻止旧状态覆盖；路由取消测试       |
| 刷新没有保留当前会话               | 用户无法回到正在调试的对话                         | 仅保存 active conversation ID 到 LocalStorage                                  |
| TypeScript async 回调推断为 never  | 构建失败、API 合约不清晰                           | 明确 streaming Promise 返回类型与工具结果类型，strict typecheck 通过           |
| SSE 网络分帧与 UTF-8 边界          | 汉字乱码、截断错误被当作成功                       | 增量 TextDecoder、buffer、done 检测；单字节分块单元测试和截断 provider fixture |
| UI 框架入口导入过大                | 主包包含未使用组件                                 | 明确子组件所属模块的按需 resolver；UI JS 从约 915KB 降至约 429KB（未 gzip）    |
| 图表单块过大                       | 监控路由下载过重                                   | echarts 与 zrender 分块，约 380KB / 176KB，按监控路由加载                      |
| 外部字体请求                       | 离线或受限网络下字体加载不稳定                     | @fontsource 本地打包                                                           |
| 小高度桌面视口挤压输入框           | 需要整页滚动才可发送                               | 低高度断点、降低工作区最小高度、收起介绍卡片                                   |
| 移动导航切页后仍覆盖内容           | 无法继续操作页面                                   | route watcher 在小屏导航后关闭侧栏                                             |
| 首轮 E2E 使用主数据库              | 测试会污染展示数据                                 | 5174/3002 独立端口、独立 DATA_FILE，测试服务自动退出                           |
| Element Plus 隐藏原生 input 定位   | 测试点击被 placeholder 或样式遮挡                  | 对可访问 combobox 用 Enter；点击可见 checkbox 标签，未使用强制点击             |
| 无效“空检索”测试词包含正常英文短词 | 测试本身得到合理命中却误判失败                     | 使用无匹配的单一哨兵词，保留正常词法搜索行为                                   |

## 逐项审查结论

- **Vue / Reactivity**：使用 setup 和 typed props/emits；四个 Store 按领域划分；异步任务通过 composable 管理；没有组件内直接 Axios/fetch。
- **Watch**：只用于偏好持久化、当前会话、滚动、图表更新和移动导航；没有 watch 触发循环 API。
- **Request abstraction**：REST Axios 与 SSE fetch 分开但共享 APIResponse 和 APIError；业务使用 Service。
- **Abort / Timeout**：Chat upstream 可取消；useRequest abort previous + generation；上传、工具和检索的浏览器等待可取消。服务端已接受的无副作用工具或索引任务不承诺回滚。
- **Memory**：ECharts dispose / ResizeObserver disconnect、文档 poll timeout 清理、stream timeout 清理、Abort listener 清理。
- **Markdown / XSS**：raw HTML 关闭、DOMPurify、无用户模板编译；复制从 code textContent 获取；恶意 HTML/URL 回归测试。
- **Type safety**：strict 与 unused checks，未使用显式 `any`；边界使用 Zod 和 unknown。API 反序列化的静态类型仍不等于全客户端运行时 schema 验证。
- **Error / Empty / Loading**：共享 RequestFeedback；Chat 错误/取消保持部分消息；KB FAILED 与 retry；Retrieval 空命中；Prompt 变量错误；监控空时间范围；Settings 离线重试。
- **Performance**：路由懒加载、按需 UI、注册五类代码语言、图表分块；字符串渲染上限 100k 字符。未引入低价值虚拟滚动或复杂缓存。
- **Security**：Key 只在 BFF，Real model allowlist，server URL 只读、可选 Bearer 恒时比较、production CSP、安全算术解析、请求体/文件限制。
- **Persistence**：单进程原子替换 JSON，文档任务重启恢复；没有声称具备数据库事务、多进程一致性或灾备。
- **Naming / Structure**：类型、服务、状态、Composable、视图、provider 分开；格式由 Prettier 统一。
- **Dead code / over-engineering**：没有额外服务、Kubernetes、数据库框架、与需求无关功能。

## 剩余明确边界

1. 无真实供应商 Key 验证，无真实 Embedding/PDF parser/模型 tool-call loop。
2. 本地数据明文，无认证账户、RBAC 或多租户。
3. 没有精确 tokenizer、付费预算、分布式限流和交易型工具幂等。
4. 当前版本不是 WCAG 完整认证、渗透测试或负载测试结果。
5. 构建时 Zod 依赖存在两条 PURE 注释提示，Rollup 自动移除注释；不影响构建。没有通过隐藏警告或修改第三方文件掩盖它们。

这些项目已经同步写入 README、JD 报告与面试材料。最终命令与浏览器验收结果以 [ACCEPTANCE_REPORT.md](ACCEPTANCE_REPORT.md) 为准。
