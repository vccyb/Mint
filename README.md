<p align="center">
  <img src="https://img.shields.io/badge/version-v0.7.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/Electron-35-blue" alt="Electron" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
</p>

<h1 align="center">Mint</h1>

<p align="center">
  <strong>自托管 AI Chat + Autonomous Coding Agent</strong><br/>
  桌面客户端 + Web 版，让 AI 助手连接你的文件系统，对话或自主完成任务。
</p>

---

## Mint 是什么？

Mint 提供两种使用方式：

- **桌面客户端（推荐）** — 基于 Electron 的原生桌面应用，直接访问本地文件系统，无需启动 Web 服务
- **Web 版** — 基于 Next.js 15 的浏览器应用，通过 `mint start` 启动

两种模式共享核心功能：

- **Chat 模式** — 类 ChatGPT 的对话界面，流式调用 Anthropic 兼容 API，支持附件和 Extended Thinking
- **Agent 模式** — 基于 Claude Agent SDK 的自主编程代理，读写文件、执行命令、并行子代理

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

### 权限系统

三种模式可配置：

- `bypassPermissions` — 所有工具调用自动通过
- `default` — 只读工具自动通过，写/执行工具需用户审批
- `plan` — 代理先生成计划，用户审核后再执行

### 文件面板 & 项目管理

- 项目绑定本地文件系统路径
- 文件树浏览器（展开/折叠/搜索）
- 文件预览（代码高亮、Markdown、图片）
- 可拖拽调整面板大小

### Rich Input（富文本输入）

Agent 模式使用 TipTap 富文本编辑器：

| 触发符 | 类型 | 用途 |
|--------|------|------|
| `@` | 文件 | 注入文件内容到 prompt |
| `/` | Skill | 引用技能 |
| `#` | MCP | 引用 MCP 工具 |

### 语音输入

集成豆包 ASR，支持实时语音转文字输入。

### 主题切换

支持亮色/暗色主题，圆形扩散动画切换（View Transition API）。

## 下载安装

从 [GitHub Releases](https://github.com/vccyb/Mint/releases) 下载最新版本：

| 平台 | 文件 |
|------|------|
| macOS (Apple Silicon) | `Mint-{version}-arm64.dmg` |
| macOS (Intel) | `Mint-{version}-x64.dmg` |

下载 DMG 后，拖拽 Mint 到 Applications 文件夹即可。

## 快速开始

### 桌面客户端

1. 从 [Releases](https://github.com/vccyb/Mint/releases) 下载并安装
2. 打开 Mint，在 Settings 页面配置 API Key
3. 创建新会话，开始使用

### 从源码运行

```bash
git clone https://github.com/vccyb/Mint.git
cd Mint
pnpm install

# 桌面客户端开发模式
cd apps/electron && pnpm dev

# 或 Web 版
cd packages/mint && pnpm dev
```

### 配置

首次运行后，在 Settings 页面配置：

1. **API Key** — Anthropic 兼容 API 密钥
2. **Base URL** — API 端点（默认 `https://open.bigmodel.cn/api/anthropic`）
3. **Model** — 模型名称（默认 `glm-5.1`）

配置存储在 `~/.mint/config.json`。

## 架构概览

```
┌─────────────────────────────────────────────┐
│              Electron Desktop App            │
│  React 19 · Tailwind CSS 4 · TipTap 3      │
├──────────────────┬──────────────────────────┤
│    Chat Mode     │       Agent Mode          │
│  Messages API    │   Claude Agent SDK        │
│  Multi-modal     │   AgentOrchestrator       │
│  SSE Streaming   │   Sub-agents · Watchdog   │
├──────────────────┴──────────────────────────┤
│              IPC Layer (Main ↔ Renderer)     │
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
| 桌面框架 | Electron 35 |
| 前端 | React 19, TypeScript 5.7+ |
| 样式 | Tailwind CSS 4, Notion 风格设计系统 |
| 构建 | esbuild (main) + Vite (renderer) |
| Agent SDK | `@anthropic-ai/claude-agent-sdk` |
| 富文本 | TipTap 3 (mention extension) |
| 状态管理 | Jotai |
| 图标 | lucide-react |
| 存储 | File-based JSONL + JSON |
| 包管理 | pnpm workspaces |

## 项目结构

```
├── apps/
│   └── electron/        ← 桌面客户端（Electron）
│       ├── src/main/         主进程（IPC, storage, agent, chat）
│       ├── src/preload/      预加载桥接
│       ├── src/renderer/     渲染进程（React UI）
│       └── electron-builder.yml
├── packages/
│   ├── mint/            ← Web 版（Next.js 15）
│   ├── shared/          ← 共享类型
│   ├── server/          ← 后端服务
│   ├── web/             ← 前端
│   ├── linting/         ← 架构约束 Linter
│   └── tools/           ← 开发工具
└── .github/workflows/   ← CI/CD
    ├── ci.yml                PR/push 构建 + lint
    └── release.yml           Tag 触发自动发布
```

## 开发

```bash
# 安装依赖
pnpm install

# 桌面客户端开发
cd apps/electron && pnpm dev

# Web 版开发
cd packages/mint && pnpm dev

# 构建桌面客户端
cd apps/electron && pnpm build && pnpm dist:mac

# 代码检查
pnpm lint
```

## 发布流程

推 tag 自动触发 GitHub Actions 构建并发布到 Releases：

```bash
git tag v0.x.0
git push origin v0.x.0
```

自动构建 macOS DMG（arm64 + x64）并上传。

## 版本历史

| 版本 | 主要变更 |
|------|---------|
| v0.7.0 | Electron 桌面客户端、IPC 全面审计修复、主题动画、CI/CD 自动发布 |
| v0.6.0 | 语音输入（豆包 ASR）、模块化重构、UX 改进 |
| v0.5.0 | AOP 日志重构、附件修复、Rich Input、多模态 Chat |
| v0.4.0 | Agent Teams 稳定性、TodoList、侧边栏 UX |
| v0.3.0 | Hydration 修复、可调整面板、文件图标和搜索 |
| v0.2.0 | 项目管理、UI 修复、Agent 改进 |

## License

MIT
