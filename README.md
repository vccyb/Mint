<p align="center">
  <img src="https://img.shields.io/badge/version-v0.5.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/Next.js-15-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
</p>

<h1 align="center">Mint</h1>

<p align="center">
  <strong>自托管 AI Chat + Autonomous Coding Agent</strong><br/>
  在你的项目目录中启动，让 AI 助手连接你的文件系统，对话或自主完成任务。
</p>

---

## Mint 是什么？

Mint 是一个基于 Next.js 15 的 Web 应用，提供两种核心模式：

- **Chat 模式** — 类 ChatGPT 的对话界面，直接流式调用 Anthropic 兼容 API，支持图片/PDF/文本附件和扩展思维（Extended Thinking）
- **Agent 模式** — 基于 Claude Agent SDK 的自主编程代理，可以读写文件、执行命令、搜索代码、运行子代理并行处理复杂任务

在任意项目目录执行 `mint start`，Mint 会启动一个 Web UI，将 AI 代理连接到你的本地文件系统，实现完整的读写执行能力。

## 功能特性

### 双模式对话

| Chat 模式 | Agent 模式 |
|-----------|-----------|
| 流式对话 | 自主读写文件 |
| 图片/PDF 附件 | 执行 Bash 命令 |
| Extended Thinking | 并行子代理（Agent Teams） |
| 多轮上下文 | 权限审批流程 |

### Agent Teams（并行子代理）

内置 5 个专业子代理，支持并行执行：

- **code-reviewer** — 代码审查（Bug、安全、风格）
- **explorer** — 代码库探索与架构分析
- **researcher** — 技术调研与文档查询
- **implementer** — 代码编写与修改
- **test-engineer** — 测试编写与执行

Lead Agent 通过 `run_in_background: true` 分发任务，结果通过 inbox 系统收集并自动恢复，支持并发控制、自动重试（3 次指数退避）和全局超时（10 分钟）。

### 权限系统

三种模式可配置：

- `bypassPermissions` — 所有工具调用自动通过
- `default` — 只读工具自动通过，写/执行工具需用户审批
- `plan` — 代理先生成计划，用户审核后再执行

### 文件面板 & 项目管理

- 项目绑定本地文件系统路径
- 文件树浏览器（展开/折叠/搜索）
- 变更文件视图（git status 风格）
- 文件预览（代码高亮、Markdown、图片）
- 可拖拽调整面板大小

### Rich Input（富文本输入）

Agent 模式使用 TipTap 富文本编辑器：

| 触发符 | 类型 | 用途 |
|--------|------|------|
| `@` | 文件 | 注入文件内容到 prompt |
| `/` | Skill | 引用技能 |
| `#` | MCP | 引用 MCP 工具 |

### Skills 系统

技能是带 YAML 前置信息的 Markdown 文件，注入到代理的系统提示中：

- 内置技能：brainstorming、writing-plans、executing-plans、skill-creator 等
- 用户技能：`~/.mint/skills/` 目录，支持 UI 端 CRUD
- 支持搜索、启用/禁用、在线编辑

### MCP 集成

- 通过 Settings UI 配置外部 MCP 服务器
- 支持命令行启动、环境变量配置
- 连接测试 + 延迟测量 + 工具发现

### 日志 & 可观测性

- 结构化日志（级别、服务名、作用域）
- 会话感知：日志视图自动过滤当前会话
- 实时刷新 + 导出

## 快速开始

### 安装

```bash
git clone https://github.com/vccyb/Mint.git
cd Mint
pnpm install
```

### 配置

首次运行后，在 Settings 页面配置：

1. **API Key** — Anthropic 兼容 API 密钥
2. **Base URL** — API 端点（默认 `https://open.bigmodel.cn/api/anthropic`）
3. **Model** — 模型名称（默认 `glm-5.1`）

配置存储在 `~/.mint/config.json`。

### 启动

```bash
# 生产模式（推荐）
cd packages/mint
pnpm build && pnpm start

# 或使用 CLI
mint start --port=3000
```

打开浏览器访问 `http://localhost:3000`。

## 架构概览

```
┌─────────────────────────────────────────────┐
│                   Web UI                     │
│  React 19 · Tailwind CSS · TipTap Editor    │
├──────────────────┬──────────────────────────┤
│    Chat Mode     │       Agent Mode          │
│  Messages API    │   Claude Agent SDK        │
│  Multi-modal     │   AgentOrchestrator       │
│  SSE Streaming   │   Sub-agents · Watchdog   │
├──────────────────┴──────────────────────────┤
│              Next.js API Routes              │
│     withLogging · SSE · Permission Flow      │
├──────────────────────────────────────────────┤
│              Storage Layer                   │
│  JSONL Sessions · JSON Config · File-based   │
├──────────────────────────────────────────────┤
│              File System                     │
│     ~/.mint/ — config, sessions, skills      │
└──────────────────────────────────────────────┘
```

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 前端 | React 19, TypeScript 5.7+ |
| 样式 | Tailwind CSS 4, Notion 风格设计系统 |
| Agent SDK | `@anthropic-ai/claude-agent-sdk` |
| 富文本 | TipTap 3 (mention extension) |
| Markdown | react-markdown, remark-gfm, rehype-highlight |
| PDF 解析 | pdf-parse |
| 图标 | lucide-react |
| 字体 | Plus Jakarta Sans, Outfit |
| 存储 | File-based JSONL + JSON |
| 包管理 | pnpm workspaces |

## 项目结构

```
packages/
├── mint/          ← 主应用（Next.js 15）
│   ├── bin/             CLI 入口
│   ├── src/app/         API 路由（30+ endpoints）
│   ├── src/components/  React 组件
│   ├── src/lib/         核心逻辑（agent, storage, streaming）
│   ├── src/hooks/       自定义 Hooks
│   └── mint-skills/     内置技能
├── server/        ← 后端服务（占位）
├── shared/        ← 共享类型
├── web/           ← 前端（占位）
├── linting/       ← 架构约束 Linter
└── tools/         ← 开发工具
```

## API 路由

| 路由 | 功能 |
|------|------|
| `POST /api/chat` | Chat 模式流式对话 |
| `POST /api/agent` | Agent 模式流式执行 |
| `POST /api/agent/answer` | 权限审批 |
| `GET/POST /api/sessions` | 会话管理 |
| `GET /api/files` | 文件树浏览 |
| `GET /api/files/content` | 文件内容读取 |
| `GET /api/files/changes` | 变更文件列表 |
| `GET/POST /api/skills` | 技能管理 |
| `GET/POST /api/mcp/config` | MCP 服务器配置 |
| `GET /api/logs` | 结构化日志 |

## 配置参考

所有用户数据存储在 `~/.mint/` 目录：

| 文件 | 用途 |
|------|------|
| `config.json` | API 密钥、模型、Base URL、权限模式 |
| `sessions/*.jsonl` | 会话元数据和消息（append-only） |
| `skills/` | 用户创建的技能 |
| `mcp-servers.json` | MCP 服务器配置 |
| `projects/*.json` | 项目元数据 |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
cd packages/mint && pnpm dev

# 生产构建
cd packages/mint && pnpm build && pnpm start

# 代码检查
pnpm lint

# 架构约束检查
pnpm lint:arch
```

## 版本历史

| 版本 | 主要变更 |
|------|---------|
| v0.5.0 | AOP 日志重构、附件修复、Rich Input、多模态 Chat |
| v0.4.0 | Agent Teams 稳定性、TodoList、侧边栏 UX |
| v0.3.0 | Hydration 修复、可调整面板、文件图标和搜索 |
| v0.2.0 | 项目管理、UI 修复、Agent 改进 |

## License

MIT
