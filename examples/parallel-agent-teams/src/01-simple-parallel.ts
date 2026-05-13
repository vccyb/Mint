/**
 * 01-simple-parallel.ts
 *
 * 最简单的并行 Agent Teams 示例。
 *
 * 展示如何使用 @anthropic-ai/claude-agent-sdk 的 query() 函数
 * 同时派发多个子 Agent 并行工作。
 *
 * 核心流程：
 * 1. 定义多个子 Agent（explorer、researcher、code-reviewer）
 * 2. 通过 prompt 引导 Lead Agent 并行调用这些子 Agent
 * 3. Lead Agent 自动汇总结果
 *
 * 运行：npx tsx src/01-simple-parallel.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";

// ============================================================
// 第一步：定义子 Agent
// ============================================================
// 每个子 Agent 有自己的角色、提示词和可用工具
// SDK 会根据 description 字段自动判断何时调用

const agents = {
  // 代码库探索 Agent：负责理解项目结构
  explorer: {
    description:
      "代码库探索和结构分析。用于理解代码架构、查找文件、追踪调用链。当需要探索项目结构或理解代码时调用。",
    prompt: [
      "你是一个高效的代码库探索员。你的职责：",
      "",
      "1. 快速定位相关文件和代码",
      "2. 分析项目架构和模块划分",
      "3. 总结代码结构和设计模式",
      "",
      "提供简洁的结构化总结，包含文件路径和关键发现。",
    ].join("\n"),
    tools: ["Read", "Glob", "Grep", "Bash"],
  },

  // 技术调研 Agent：负责搜索和分析技术方案
  researcher: {
    description:
      "技术调研和方案分析。用于搜索文档、对比技术方案、提供技术建议。当需要调研或对比方案时调用。",
    prompt: [
      "你是一个技术调研员。你的职责：",
      "",
      "1. 搜索和整理相关技术文档",
      "2. 对比不同技术方案的优缺点",
      "3. 提供基于证据的技术建议",
      "",
      "使用 WebSearch 搜索最新资料，WebFetch 阅读文档页面。",
      "提供结构化的调研报告，包含信息来源和可信度评估。",
    ].join("\n"),
    tools: ["Read", "Glob", "Grep", "Bash", "WebSearch", "WebFetch"],
  },

  // 代码审查 Agent：负责审查代码质量
  "code-reviewer": {
    description:
      "代码质量审查。用于审查代码风格、最佳实践、潜在 bug。当用户要求 review 或审查代码时调用。",
    prompt: [
      "你是一个专注于代码质量的审查员。你的职责：",
      "",
      "1. 审查代码风格和一致性",
      "2. 发现潜在 bug 和逻辑错误",
      "3. 评估代码可读性和可维护性",
      "4. 提出具体的改进建议",
      "",
      "审查完成后，提供结构化的审查报告，按严重程度分级。",
    ].join("\n"),
    tools: ["Read", "Glob", "Grep", "Bash"],
  },
};

// ============================================================
// 第二步：构造 prompt，引导 Lead Agent 并行派发
// ============================================================
// 关键技巧：在 prompt 中明确要求并行使用多个 Agent
// Lead Agent 会通过 Agent 工具的 run_in_background 参数
// 实现并行执行

const userTask = [
  "请对这个项目进行全面的代码分析。你需要同时执行以下三个任务：",
  "",
  "1. 使用 explorer agent 分析项目的整体架构和目录结构",
  "2. 使用 researcher agent 调研项目中使用的主要技术栈和依赖",
  "3. 使用 code-reviewer agent 审查核心模块的代码质量",
  "",
  "请并行执行这三个任务，然后汇总结果给出综合分析报告。",
].join("\n");

// ============================================================
// 第三步：调用 query() 并处理流式消息
// ============================================================

async function main() {
  console.log("=== 并行 Agent Teams 示例 ===\n");
  console.log("任务：对项目进行全面的并行代码分析\n");
  console.log("--- 开始执行 ---\n");

  // 调用 SDK 的 query 函数
  // allowedTools 中必须包含 "Agent" 才能使用子 Agent 功能
  const stream = query({
    prompt: userTask,
    options: {
      // Agent 工具是使用子 Agent 的前提
      allowedTools: ["Read", "Glob", "Grep", "Bash", "Agent"],
      agents,
      // 开启流式消息，可以看到子 Agent 的实时执行状态
      includePartialMessages: true,
    },
  });

  // 用于跟踪子 Agent 的执行状态
  const activeAgents = new Map<string, string>();

  // 遍历流式消息
  for await (const message of stream) {
    // 处理系统消息（子 Agent 启动、完成等事件）
    if (message.type === "system") {
      const sysMsg = message as { subtype?: string; task_id?: string; description?: string; task_type?: string; summary?: string; status?: string };

      // 子 Agent 启动
      if (sysMsg.subtype === "task_started" && sysMsg.task_id) {
        activeAgents.set(sysMsg.task_id, sysMsg.description ?? "执行中...");
        console.log(`[子Agent启动] ${sysMsg.description ?? sysMsg.task_id}`);
      }

      // 子 Agent 完成通知
      if (sysMsg.subtype === "task_notification" && sysMsg.task_id) {
        const desc = activeAgents.get(sysMsg.task_id) ?? sysMsg.task_id;
        console.log(`[子Agent完成] ${desc} - 状态: ${sysMsg.status ?? "completed"}`);
        if (sysMsg.summary) {
          console.log(`  摘要: ${sysMsg.summary.slice(0, 100)}...`);
        }
        activeAgents.delete(sysMsg.task_id);
      }
    }

    // 处理流式文本输出（Lead Agent 的回复）
    if (message.type === "stream_event") {
      const event = (message as { event: { type: string; delta?: { type: string; text?: string } } }).event;
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta" &&
        event.delta.text
      ) {
        // 输出 Lead Agent 的文本回复
        process.stdout.write(event.delta.text);
      }
    }

    // 处理最终结果
    if (message.type === "result") {
      const result = message as { result?: string; duration_ms?: number; num_turns?: number; total_cost_usd?: number };
      console.log("\n\n--- 执行完成 ---");
      console.log(`耗时: ${((result.duration_ms ?? 0) / 1000).toFixed(1)}s`);
      console.log(`轮次: ${result.num_turns ?? 0}`);
      console.log(`费用: $${(result.total_cost_usd ?? 0).toFixed(4)}`);
    }
  }
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
