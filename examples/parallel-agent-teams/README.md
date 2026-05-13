# Parallel Agent Teams 示例

本示例展示如何使用 `@anthropic-ai/claude-agent-sdk` 实现并行模式的 Agent Teams。

## 核心概念

**Agent Teams** 是一种将复杂任务分解为多个子任务、并由多个专门的子 Agent 并行处理的模式。

关键要素：

- **Lead Agent（主 Agent）**：接收用户任务，负责分解和调度
- **Sub Agent（子 Agent）**：执行具体的专业任务（如代码探索、调研、审查等）
- **并行执行**：通过 `run_in_background: true` 让多个子 Agent 同时工作
- **结果汇总**：Lead Agent 收集所有子 Agent 的结果并整合

## 文件说明

| 文件 | 说明 |
|------|------|
| `src/01-simple-parallel.ts` | 最简单的并行示例，展示核心 API 用法 |
| `src/02-team-definition.ts` | 展示如何定义和配置 Agent Team |
| `src/03-result-aggregation.ts` | 展示如何收集和汇总并行 Agent 的结果 |

## 运行方式

```bash
# 安装依赖
npm install

# 设置 API Key
export ANTHROPIC_API_KEY=your-api-key

# 运行示例（需要 tsx 或 ts-node）
npx tsx src/01-simple-parallel.ts
npx tsx src/02-team-definition.ts
npx tsx src/03-result-aggregation.ts
```

## SDK 核心 API

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// query() 返回 AsyncGenerator，逐条产出消息
const stream = query({
  prompt: "你的任务描述",
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Agent"],
    agents: {
      "agent-name": {
        description: "何时使用这个 Agent",
        prompt: "Agent 的系统提示词",
        tools: ["Read", "Grep"],
      },
    },
  },
});

for await (const message of stream) {
  // 处理每条消息
}
```

## 并行执行原理

当 Lead Agent 调用 `Agent` 工具时，如果设置 `run_in_background: true`，子 Agent 会在后台异步执行。Lead Agent 可以同时派发多个子 Agent，它们并行工作，完成后通过 `task_notification` 系统消息通知 Lead Agent。

```
用户任务
    |
    v
Lead Agent --+-- explorer（后台）
             +-- researcher（后台）
             +-- code-reviewer（后台）
    |
    v
汇总结果 -> 返回给用户
```
