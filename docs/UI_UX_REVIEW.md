# UI / UX 第二阶段验收

基于现有 Vue 3 + Express 项目进行视觉重构，保留 API、共享协议、Pinia store、SSE、取消、超时、检索与工具执行逻辑。没有新增运行时依赖，没有重建项目或修改旧提交。

## 设计规范

`src/assets/tokens.css` 是唯一语义颜色来源；`main.css` 定义基础排版、壳层和组件；`workspaces.css` 定义七个工作区布局。页面不再各自维护一套 scoped 色值。ECharts 从同一组 CSS 变量读取配色，主题切换时更新。

| 维度   | 规范                                                                                     |
| ------ | ---------------------------------------------------------------------------------------- |
| 浅色   | 冷中性背景 `#f7f8fa`、白色主表面、细灰边框                                               |
| 深色   | 石墨背景 `#181b21`、分层表面 `#20242c` / `#1c2027`                                       |
| 强调色 | 浅色 `#5b55be`，深色 `#b0a9f7`；仅用于主要操作、选中态与关键数据                         |
| 状态   | success / warning / danger / info 分别有文本与背景 token；同时保留文字与图标             |
| 间距   | 4、8、12、16、20、24、32、40、48、64 px                                                  |
| 圆角   | 6、8、10、12、16 px；输入区 16，主面板 12，小控件 6–8                                    |
| 字体   | 本地 DM Sans / Manrope；中文回退 PingFang SC / Microsoft YaHei；代码 Cascadia / Consolas |
| 层级   | 主标题 26、次标题 18、正文 14、辅助正文 13、表单/元信息 11–12 px                         |
| 数字   | 指标、Token、耗时、分数采用 tabular numerals                                             |
| 动效   | 160–200 ms；尊重 reduced motion，图表同样关闭动画                                        |
| 焦点   | 键盘 focus-visible、表单聚焦边框、可聚焦的长输出区域                                     |

核心文字在主表面的实测对比度：浅色主文字 15.17:1、次文字 5.99:1、辅助文字 4.74:1、强调色 6.02:1；深色分别 13.25:1、8.20:1、6.03:1、7.31:1。此检查针对核心 token 组合，不等同于全站无障碍认证。

## 页面改动

- **壳层**：216 px 侧栏、64 px Header；收敛导航，Settings 与用户区域移至底部，保留 API 状态、Token 与 Demo Mode。折叠为图标栏，移动端为带遮罩的导航。
- **Chat**：开放式 assistant 正文、浅底 user 消息、四类欢迎建议、悬停/键盘操作、更多菜单删除历史；模型选择器和 Context 路由实际可用。保留 Enter/Shift+Enter/IME、流式状态、停止、重试、重新生成、复制、搜索与重命名。窄屏配置以浮层展示并提供关闭按钮。
- **Knowledge**：集合卡片包含文档/Chunk 数、状态和更新时间；空集合显示 Empty。上传区支持鼠标、键盘与拖拽，加载骨架、解析失败与重试保留。
- **Retrieval**：文档来源卡片、排名、词法分数条、可展开 Metadata；生成答案与 Sources 独立显示。明确说明词法分数不是向量相似度。
- **Agent**：六步连接时间线，状态、图标与耗时可扫描；参数和结果可展开，JSON 使用现有安全 Markdown/高亮/复制组件。失败位置与等待步骤分开显示；不声称显示模型思维链。
- **Prompt**：模板库、编辑器、输出区分栏；Few-shot 折叠，变量并排、参数紧凑，长输出在独立区域阅读；版本快照、恢复和流式测试保持。
- **Monitoring**：五个统一 KPI，图表共享语义配色、可读轴标签、千位缩写与主题化 Tooltip；基线来源始终可见，日期筛选与刷新保留。
- **Settings**：Workspace & provider、Network & access、Appearance、Model defaults 分组；高级 provider 配置按需展开。
- **反馈状态**：错误先说明问题与恢复操作，错误码/Request ID 放在 Show details；Diagnostics 默认收起；无数据时提供下一步操作。

## 视觉审阅与修正

按页面层级、阅读密度、首屏重点、边界对齐、控件状态、深色对比度和窄屏可操作性审阅实际截图。

首轮发现并修正：选择器内部宽度塌缩、输入区模型名被挤压、Chat 高度造成外层滚动、欢迎建议首屏遮挡、Agent 最终结果位置过低、Prompt 保存操作首屏过低、移动端日期筛选溢出。合成数据与演示说明保留；没有用隐藏业务内容或截图后期处理掩盖问题。

## 可重复截图

执行 `npm run test:visual`，使用隔离的 5175/3004 服务与临时数据库。主图均为 1440×900 的真实浏览器 viewport 截图，无拼接、修图或全页缩放。Chat 的精简样例只写入该临时数据库，不修改用户当前对话。

主图：`chat.png`、`knowledge.png`、`retrieval.png`、`agent.png`、`prompt.png`、`monitoring.png`。补充：欢迎页、检索生成答案、Settings、深色 Chat / Monitoring / Settings、1280 / 1024 / 390 Chat。

截图模式 `?presentation=1` 只隐藏 Diagnostics。功能状态、空状态、失败状态和真实数据说明不受该参数影响。

## 验证与边界

2026-09-20 本地验收结果：

| 检查                  | 结果                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------- |
| `npm run build`       | 通过，前端与 BFF 构建完成                                                               |
| `npm run typecheck`   | 通过，Vue / 前端 / shared / BFF 类型检查                                                |
| `npm run lint`        | 通过，0 error / 0 warning                                                               |
| `npm test`            | 34/34，通过原有 3 个测试文件                                                            |
| `npm run test:smoke`  | 10/10，通过原有行为场景                                                                 |
| `npm run test:visual` | 新增 3/3，通过                                                                          |
| 响应式矩阵            | 7 页 × 1440 / 1280 / 1024 / 390 × light / dark，共 56 组，无页面横向溢出或 pageerror    |
| 交互补充              | 四张建议卡、Context 路由、JSON 展开、窄屏配置开关、移动端历史选择、主题持久化           |
| 生产构建复核          | `NODE_ENV=production` 下独立 3003 服务：SPA 路由、Chat、Settings 和深色 Monitoring 正常 |
| 架构保留              | 与第一阶段末尾 `611c337` 比较，server/shared/api/services/stores/composables 无改动     |

原有 Vitest 数量保持 34，Smoke 保持 10。Smoke 仅因 UI 更新而展开 Diagnostics / Show details，并把工具结果断言定位到最终答案，避免高亮 JSON 中相同数字造成歧义；没有删除业务断言。新增 3 个视觉测试独立运行，输出目录与 Smoke 隔离。期间发现并修复了并行测试输出目录清理冲突。

可机读证据：[responsive matrix](visual-responsive.json)、[text contrast](visual-contrast.json)。Build 仍有依赖 Zod 自带 PURE 注释位置警告，不影响构建，未引入新的构建错误。

阶段提交：`6529411` 设计变量、`571b250` 壳层与 Chat、`539dcdb` 知识/检索/工具/Prompt/分析工作区、`fb0c5cc` 响应式与主题视觉验收。截图和本文随后由独立文档提交保存；旧历史未改写。

当前测试范围内未发现阻断性的视觉问题。不是对所有浏览器、操作系统字体和任意长内容的全面保证。

长对话、长 JSON、完整仪表盘和窄屏文档表格采用正常滚动阅读；截图展示首屏，未将完整内容强行压缩。移动端保持基本可用，重点优化桌面工作区。真实供应商调用需要用户配置服务端凭据；本轮不新增向量检索、多租户或生产部署能力。
