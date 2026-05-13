# Mint 后续特性开发计划

> 基于 Proma (v0.7.1+)、OpenAI Codex CLI 的特性对比分析，结合 Mint 当前能力，规划后续开发方向。
>
> 日期：2026-05-13 | 当前版本：v0.4.0

---

## 一、现状对比矩阵

| 能力维度 | Mint (当前) | Proma | Codex CLI | 优先级 |
|---------|------------|-------|-----------|--------|
| Chat 模式 | ✅ 单 Provider | ✅ 多 Channel/多 Provider | ❌ 仅 CLI | — |
| Agent 模式 | ✅ SDK + 编排 | ✅ SDK + 编排 | ✅ 自研 Agent Loop | — |
| 多模型/多 Provider | ❌ 单一 Anthropic 兼容 | ✅ 10+ Provider 适配器 | ❌ 仅 OpenAI | **P0** |
| Agent Teams | ✅ 基础 inbox 通信 | ✅ inbox + watchdog + 自动组建 | ❌ 单 Agent | — |
| 权限系统 | ✅ 3 模式 (bypass/default/plan) | ✅ 4 模式 + 智能分类 + 白名单 | ✅ 3 层 (suggest/auto-edit/full-auto) | **P1** |
| 沙箱安全 | ❌ 无沙箱 | ❌ 无沙箱 | ✅ OS 级沙箱 (Landlock/Seatbelt) | **P2** |
| Skills 系统 | ✅ 基础 CRUD | ✅ 全生命周期 (发现/创建/评估/迭代) | ❌ 无 | **P1** |
| 记忆系统 | ❌ 无 | ✅ MemOS Cloud 跨会话记忆 | ❌ 无 | **P1** |
| MCP 集成 | ✅ 配置/测试 | ✅ 配置/测试 + Memory MCP | ❌ 无 | — |
| 消息平台集成 | ❌ 无 | ✅ 飞书/微信/钉钉 | ❌ 无 | **P2** |
| Rich Input | ✅ TipTap + 3 类 Mention | ✅ TipTap + 文件附件解析 | ❌ CLI | — |
| System Prompt 管理 | ❌ 仅配置 | ✅ 多 Prompt 模板 + 缓存优化 | ✅ AGENTS.md | **P1** |
| 代码渲染 | ✅ 基础 Markdown | ✅ Shiki + Mermaid + KaTeX | ✅ Terminal diff | **P1** |
| 会话分叉/回溯 | ❌ 无 | ✅ 分叉 + SDK 消息回放 | ❌ 无 | **P2** |
| 自动标题生成 | ❌ 无 | ✅ LLM 自动生成 | ❌ 无 | **P2** |
| 代理/VPN 支持 | ❌ 无 | ✅ 系统代理检测 + 自定义代理 | ❌ 无 | **P2** |
| 图片生成 | ❌ 无 | ✅ Nano Banana (Gemini) | ❌ 无 | **P3** |
| 快捷键 | ❌ 基础 | ✅ 全局快捷键 + 系统热键 | ✅ CLI 快捷键 | **P3** |
| 桌面端 | ❌ Web only | ✅ Electron | ✅ Terminal | **P3** |
| 文档解析 | ❌ 基础 | ✅ PDF/Office/Word | ❌ 无 | **P3** |

---

## 二、P0 — 核心缺失（必须做）

### 2.1 多 Provider 适配器系统

**参考**：Proma 的 `packages/core/src/providers/` 适配器模式

**现状问题**：Mint 当前硬绑定 ZhiPu GLM 单一 Provider，无法切换到其他 Anthropic 兼容服务或非 Anthropic API。

**方案**：

```
src/lib/providers/
  adapter.ts            # ProviderAdapter 接口
  anthropic-adapter.ts  # Anthropic Messages API (含 extended_thinking)
  openai-adapter.ts     # OpenAI Chat Completions (兼容 DeepSeek/Qwen/MiniMax 等)
  google-adapter.ts     # Google Generative Language API
  channel-storage.ts    # Channel 配置持久化
```

**核心接口**：
```typescript
interface ProviderAdapter {
  chat(params: ChatParams): AsyncIterable<StreamChunk>;
  models(): Promise<ModelInfo[]>;
  testConnection(): Promise<TestResult>;
}
```

**关键能力**：
- 每个 "Channel" 存储 provider 类型 + base URL + 加密 API key
- Chat 模式按 Channel 路由到不同 Adapter
- Agent 模式仍走 Claude Agent SDK，但支持非 Claude 的 Anthropic 兼容端点
- Channel 切换无需重启

**预估工作量**：中（~3-5 天）

---

## 三、P1 — 体验提升（应该做）

### 3.1 智能权限系统升级

**参考**：Proma 的 4 模式 + 工具分类 + 会话白名单；Codex 的 3 层沙箱模式

**现状问题**：Mint 的权限只有简单的 bypass/default/plan 三档，default 模式下所有非只读工具都要询问。

**增强点**：

1. **新增 `auto` 智能模式**：基于工具分类自动决策
   - 安全工具自动放行：Read, Glob, Grep, WebSearch, WebFetch, TodoRead, TodoWrite, TaskOutput, Agent
   - 安全 Bash 命令自动放行：git status/log/diff, ls, head, tail, grep, which, pwd, tree, node --version 等
   - 危险命令检测：rm, sudo, chmod, pipe (`|`), redirect (`>`), chain (`&&`)
   - 危险操作需确认：Edit, Write, Bash (非白名单命令)

2. **会话级白名单**：用户点击 "Always allow" 后，该工具/Bash 命令在当前会话内自动放行

3. **Worker Agent 自动放行**：子 Agent 的工具调用自动审批，避免 UI 阻塞死锁

**涉及文件**：`lib/agent-adapter.ts`, `lib/constants.ts`, 新增 `lib/tool-classifier.ts`

---

### 3.2 跨会话记忆系统

**参考**：Proma 的 MemOS Cloud 集成

**现状问题**：每个会话都是全新开始，Agent 无法记住用户偏好、项目约定或之前的决策。

**方案**：

```
src/lib/memory/
  memory-store.ts       # 本地记忆存储 (JSONL)
  memory-search.ts      # 语义搜索 (关键词/向量)
  memory-tools.ts       # Agent 可用的记忆工具 (recall/save)
```

**核心能力**：
- Agent 可通过 `recall_memory(query)` 搜索历史记忆
- Agent 可通过 `save_memory(content)` 存储重要信息
- 记忆类型：事实 (facts)、偏好 (preferences)、约定 (conventions)
- 注入方式：作为 system prompt 的一部分自动注入相关记忆
- 存储：本地 `~/.mint/memories.jsonl`，未来可接 MemOS Cloud

**注入时机**：
- 每次新会话开始时，根据用户输入检索相关记忆注入 context
- Agent 调用 `save_memory` 时追加记录

---

### 3.3 System Prompt 模板管理

**参考**：Proma 的 `system-prompts.json` + 动态上下文注入

**现状问题**：System prompt 只有一个配置字段，无法根据场景切换。

**方案**：
- `~/.mint/system-prompts/` 目录存放多个 Prompt 模板
- 每个 Prompt 模板是 Markdown 文件，支持变量插值：`{{currentDate}}`, `{{projectPath}}`, `{{skills}}`
- UI 中可切换模板或创建新模板
- 动态注入：当前时间、工作目录、可用 MCP 工具列表、技能列表
- Prompt caching 优化：静态部分放在前面，动态部分放在后面

---

### 3.4 代码渲染增强

**参考**：Proma 的 Shiki 语法高亮 + Mermaid 图表 + KaTeX 数学公式

**现状问题**：当前 Markdown 渲染是基础实现，缺少语法高亮和富内容支持。

**增强点**：

| 能力 | 描述 | 实现方案 |
|------|------|---------|
| 语法高亮 | 代码块按语言着色 | 集成 Shiki (支持 100+ 语言，自带主题) |
| Mermaid 图表 | 流程图/时序图/甘特图渲染 | `mermaid` npm 包或 `@mermaid-js/mermaid-cli` |
| KaTeX 数学 | LaTeX 数学公式渲染 | `katex` npm 包 |
| Diff 高亮 | 代码变更的 additions/deletions 着色 | 自定义 Shiki transformer |
| 代码复制 | 一键复制代码块 | 剪贴板 API |
| 代码块折叠 | 长代码块默认折叠 | CSS + 状态管理 |

**预估工作量**：小-中（~2-3 天）

---

### 3.5 Skills 系统增强

**参考**：Proma 的全生命周期 Skills 系统 (发现 → 创建 → 评估 → 迭代)

**现状问题**：Mint 的 Skills 只有基础 CRUD，缺少发现、评估、持续改进能力。

**增强路线**：

**Phase A — 内置技能包**：
- `brainstorming` — 协作式头脑风暴，逐步提问探索方案
- `plan-writer` — 计划编写，自动生成执行计划
- `plan-executor` — 计划执行，按步骤完成任务
- `tool-builder` — 通过对话创建自定义 HTTP 工具

**Phase B — 技能发现与安装**：
- 搜索公开技能仓库（npm/GitHub）
- 一键安装到 `~/.mint/skills/`
- 版本管理与升级

**Phase C — 技能创建与评估**：
- 通过对话创建技能 (skill-creator)
- 自动化评估：正确性、完整性、触发准确性
- 持续改进：检测使用模式，建议优化

---

## 四、P2 — 差异化特性（可以做）

### 4.1 消息平台集成

**参考**：Proma 的飞书/微信/钉钉集成

**核心价值**：让用户通过手机 IM 远程控制 Agent，实现移动办公。

**飞书集成设计**：
```
src/lib/integrations/
  feishu/
    bridge.ts          # WebSocket 长连接
    message-handler.ts  # 消息路由（私聊/群聊 @触发）
    command-parser.ts   # /workspace, /new, /help 命令解析
    types.ts
```

**关键特性**：
- 私聊：直接与 Agent 对话
- 群聊：通过 @机器人 触发，回复以 thread 形式避免刷屏
- 文件/图片接收：保存到工作目录
- 命令系统：切换工作区、新建会话、查看状态

---

### 4.2 会话分叉与回溯

**参考**：Proma 的 Session Fork + SDK 消息回放

**功能描述**：
- **分叉 (Fork)**：从任意历史消息处创建新分支，探索不同方向
- **回溯 (Rewind)**：回到某个历史节点，丢弃后续消息
- **对比 (Compare)**：并排查看多个分支的结果

**实现要点**：
- 消息增加 `parentId` 和 `branchId` 字段
- UI 中显示分支树（类似 Git 分支可视化）
- SDK 消息持久化，支持从任意点重建 context

---

### 4.3 OS 级沙箱（Codex 思路）

**参考**：Codex CLI 的 Landlock (Linux) + Seatbelt (macOS) 沙箱

**核心思路**：Agent 执行的所有命令在受限环境中运行。

**macOS 方案**：
```typescript
// 使用 sandbox-exec 限制文件系统访问
const sandboxProfile = `
(version 1)
(deny default)
(allow file-read* (subpath "${projectPath}"))
(allow file-write* (subpath "${projectPath}"))
(deny network*)
`;
```

**Linux 方案**：
- 使用 Landlock LSM (kernel 5.13+)
- 通过 `landlock` Rust crate 或 Node.js binding 限制路径访问
- 阻止对项目目录外的写入

**策略层级**：
1. `strict` — 只读 + 禁止网络
2. `project` — 项目目录内读写 + 禁止网络
3. `trusted` — 无限制

---

### 4.4 代理与网络配置

**参考**：Proma 的代理检测 + 自定义代理

**功能描述**：
- 自动检测系统代理设置 (HTTP_PROXY, HTTPS_PROXY)
- UI 中配置自定义代理
- 代理感知的 fetch 函数
- 支持 SOCKS5 代理

---

### 4.5 自动标题生成

**参考**：Proma 的 LLM 自动标题生成

**功能描述**：
- 新会话的第一条用户消息后，自动调用 LLM 生成会话标题
- 使用快速/廉价模型 (如 haiku) 生成，控制成本
- 标题长度限制 50 字符
- 异步生成，不阻塞主流程

---

### 4.6 .context/ 上下文目录

**参考**：Proma 的双层 `.context/` 目录

**功能描述**：
- **项目级** `.context/`：持久化知识（项目架构说明、约定、关键决策）
- **会话级** `.context/`：临时上下文（当前任务、中间状态）
- Agent 自动读取 `.context/` 内容作为额外上下文
- 支持手动编辑 `.context/` 文件来引导 Agent 行为

---

## 五、P3 — 锦上添花（有空再做）

### 5.1 图片生成/编辑

**参考**：Proma 的 Nano Banana (Gemini Image Generation)

- 通过 Gemini API 生成/编辑图片
- 支持多轮编辑（参考图片 + 文字指令）
- 生成的图片保存到 attachments 目录

### 5.2 全局快捷键

- 注册系统级热键，快速唤起 Mint 窗口
- 常用快捷键：新建会话、切换模式、聚焦输入框

### 5.3 Electron 桌面端

**参考**：Proma 的 Electron 架构

- 将 Next.js Web 应用打包为 Electron 桌面应用
- 优势：系统托盘、全局热键、原生文件对话框、安全存储 API Key
- IPC 架构：Main → Preload → Renderer

### 5.4 文档解析能力

**参考**：Proma 的 PDF/Office 解析

- PDF 解析 (`pdf-parse`)
- Word 文档 (`word-extractor`, `officeparser`)
- Excel 表格 (`xlsx`)
- PowerPoint (`pptxgenjs`)
- 解析结果作为附件内容注入 Agent 上下文

### 5.5 Chat 模式自定义工具

**参考**：Proma 的 `chat-tools.json` 自定义 HTTP 工具

- 用户通过 UI 或 JSON 创建自定义 HTTP 工具
- 配置：URL 模板、Method、Headers、参数定义、结果路径提取
- Chat 模式下 Agent 可调用这些工具
- 示例：查询 Jira、调用内部 API、获取天气

### 5.6 工作空间 Watcher

- 文件系统监听工作空间变更
- 自动检测代码修改并通知 Agent
- 支持热加载配置文件变更

### 5.7 教程/引导系统

- 首次使用引导 (Onboarding)
- 内置 Markdown 教程
- 功能发现提示

---

## 六、架构演进路线

### Phase 1 — 基础完善 (v0.5.0)

```
目标：补齐核心短板，提升基础体验

□ 多 Provider 适配器系统
□ 智能权限分类器
□ Shiki 语法高亮
□ System Prompt 模板管理
□ 自动标题生成
```

### Phase 2 — 能力扩展 (v0.6.0)

```
目标：扩展 Agent 能力边界

□ 跨会话记忆系统
□ Skills 全生命周期 (发现/创建/评估)
□ 会话分叉与回溯
□ .context/ 上下文目录
□ Mermaid/KaTeX 渲染
```

### Phase 3 — 生态集成 (v0.7.0)

```
目标：打通外部生态，实现平台化

□ 飞书/微信/钉钉集成
□ Chat 模式自定义 HTTP 工具
□ 代理/VPN 配置
□ 文档解析 (PDF/Office)
□ OS 级沙箱 (可选)
```

### Phase 4 — 平台化 (v0.8.0)

```
目标：从工具到平台

□ Electron 桌面端
□ 全局快捷键 + 系统托盘
□ 图片生成/编辑
□ 工作空间 Watcher
□ 教程/引导系统
□ 插件/扩展 API
```

---

## 七、技术债务清单

在开发新特性之前，建议先处理以下技术债：

| # | 问题 | 建议 |
|---|------|------|
| 1 | 两套 `Project` 类型 (`group.ts` vs `project.ts`) | 统一为一个类型，用 discriminated union 区分 |
| 2 | Sessions vs Threads 双系统并存 | 逐步迁移到 Thread 系统，废弃 Session |
| 3 | API Key 明文存储 | 接入 OS 级加密存储 (如 Electron safeStorage) |
| 4 | 无错误边界 | 添加 React Error Boundary 防止组件崩溃导致白屏 |
| 5 | 无单元测试 | 对核心 lib 模块添加 vitest 测试 |
| 6 | CSS 类名不一致 | 统一 Tailwind 设计系统 (spacing, color, typography) |
| 7 | 组件文件过大 (>300行) | 拆分 agent-view.tsx, message-item.tsx 等 |

---

## 八、参考资源

- **Proma**：`/参考项目/Proma-main/` — Electron + Jotai + Claude Agent SDK，功能最完整的参考实现
- **Codex CLI**：`github.com/openai/codex` — Rust 核心 + OS 沙箱，安全设计的标杆
- **Claude Agent SDK**：`@anthropic-ai/claude-agent-sdk` — Mint Agent 模式的基础
- **TipTap**：`@tiptap/react` — Rich Input 的基础框架
