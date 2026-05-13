/**
 * 02-team-definition.ts
 *
 * 展示如何定义和配置一个完整的 Agent Team。
 *
 * 本示例涵盖：
 * 1. Team 成员的定义（角色、工具、提示词）
 * 2. 动态创建 Agent 定义（工厂模式）
 * 3. Team 的初始化和并行派发模式
 * 4. 通过 systemPrompt 控制 Lead Agent 的行为
 *
 * 运行：npx tsx src/02-team-definition.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

// ============================================================
// 子 Agent 工具集定义
// ============================================================
// 预定义常用的工具集，方便在多个 Agent 之间复用

const TOOLSETS = {
  // 只读工具集：适合分析和审查类 Agent
  readOnly: ["Read", "Glob", "Grep"],

  // 执行工具集：适合需要运行命令的 Agent
  execution: ["Read", "Glob", "Grep", "Bash"],

  // 写入工具集：适合需要修改代码的 Agent
  write: ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],

  // 调研工具集：包含网络搜索能力
  research: ["Read", "Glob", "Grep", "Bash", "WebSearch", "WebFetch"],
} as const;

// ============================================================
// Agent 工厂函数
// ============================================================
// 使用工厂模式可以灵活地创建不同配置的 Agent
// 适用于需要根据运行时条件动态调整 Agent 行为的场景

/**
 * 创建代码审查 Agent
 * @param strictMode 是否使用严格模式（影响模型选择和审查深度）
 */
function createCodeReviewer(strictMode: boolean): AgentDefinition {
  return {
    description:
      "代码质量审查专家。用于审查代码风格、安全漏洞、最佳实践和潜在问题。",
    prompt: [
      `你是一个${strictMode ? "严格" : "常规"}的代码审查专家。`,
      "",
      "审查要点：",
      strictMode ? "1. 安全漏洞（XSS、注入、认证问题等）" : "1. 代码风格和可读性",
      "2. 潜在 bug 和逻辑错误",
      "3. 性能问题",
      "4. 代码可维护性",
      "",
      "按 Critical / Warning / Info 三级分类输出审查结果。",
      "每个问题给出具体的文件路径、行号和修复建议。",
    ].join("\n"),
    // 严格模式使用更强大的模型
    model: strictMode ? "opus" : "sonnet",
    tools: [...TOOLSETS.readOnly],
    // 限制最大轮次，防止审查过深
    maxTurns: strictMode ? 20 : 10,
  };
}

/**
 * 创建测试工程师 Agent
 */
function createTestEngineer(): AgentDefinition {
  return {
    description:
      "测试用例编写和执行。用于创建单元测试、集成测试，验证代码正确性。",
    prompt: [
      "你是一个专业的测试工程师。你的职责：",
      "",
      "1. 编写覆盖核心逻辑的单元测试",
      "2. 考虑边界条件和异常场景",
      "3. 运行测试并确保全部通过",
      "",
      "先阅读被测代码理解接口和行为，再编写针对性的测试。",
      "使用项目已有的测试框架和约定。",
    ].join("\n"),
    tools: [...TOOLSETS.write],
    maxTurns: 15,
  };
}

/**
 * 创建文档编写 Agent
 */
function createDocWriter(): AgentDefinition {
  return {
    description:
      "文档编写和整理。用于编写 API 文档、README、使用指南等。",
    prompt: [
      "你是一个技术文档专家。你的职责：",
      "",
      "1. 阅读代码并理解功能和接口",
      "2. 编写清晰、结构化的技术文档",
      "3. 包含使用示例和注意事项",
      "",
      "文档风格：简洁、准确、有层次。",
    ].join("\n"),
    tools: [...TOOLSETS.readOnly],
    maxTurns: 10,
  };
}

// ============================================================
// Team 配置
// ============================================================

interface TeamConfig {
  /** Team 名称 */
  name: string;
  /** Team 成员的 Agent 定义 */
  agents: Record<string, AgentDefinition>;
  /** Lead Agent 的系统提示词 */
  leadPrompt: string;
  /** 允许使用的工具（Lead Agent 级别） */
  allowedTools: string[];
}

/**
 * 构建一个完整的 Agent Team
 * @param strictReview 是否使用严格的代码审查
 */
function buildTeam(strictReview: boolean): TeamConfig {
  return {
    name: "code-analysis-team",
    agents: {
      // 探索员：负责理解项目结构
      explorer: {
        description: "代码库探索和结构分析。当需要了解项目架构或查找文件时调用。",
        prompt: [
          "你是一个高效的代码库探索员。",
          "快速定位相关文件和代码，追踪函数调用链和依赖关系。",
          "提供简洁的结构化总结，包含文件路径和关键发现。",
        ].join("\n"),
        tools: [...TOOLSETS.execution],
      },

      // 审查员：根据配置决定严格程度
      reviewer: createCodeReviewer(strictReview),

      // 测试工程师：负责编写和运行测试
      tester: createTestEngineer(),

      // 文档专家：负责编写文档
      docWriter: createDocWriter(),
    },

    // Lead Agent 的系统提示词：控制并行派发策略
    leadPrompt: [
      "你是一个 Agent Team 的 Lead Agent。你的职责是协调团队成员完成任务。",
      "",
      "工作原则：",
      "1. 分析用户任务，拆分为子任务",
      "2. 将子任务分配给合适的团队成员（Agent）",
      "3. 尽可能并行派发多个 Agent 以提高效率",
      "4. 收集所有 Agent 的结果，汇总成最终报告",
      "",
      "重要：",
      "- 对于独立的子任务，请并行派发（使用 run_in_background: true）",
      "- 对于有依赖关系的子任务，按顺序执行",
      "- 汇总时要整合各 Agent 的发现，去除重复，突出重点",
    ].join("\n"),

    allowedTools: ["Read", "Glob", "Grep", "Bash", "Agent"],
  };
}

// ============================================================
// 执行 Team 任务
// ============================================================

async function runTeamTask(task: string, teamConfig: TeamConfig) {
  console.log(`=== ${teamConfig.name} ===\n`);
  console.log(`任务: ${task}\n`);
  console.log(`团队成员: ${Object.keys(teamConfig.agents).join(", ")}\n`);
  console.log("--- 开始执行 ---\n");

  const stream = query({
    prompt: task,
    options: {
      allowedTools: teamConfig.allowedTools,
      agents: teamConfig.agents,
      systemPrompt: teamConfig.leadPrompt,
      includePartialMessages: true,
    },
  });

  // 跟踪子 Agent 状态
  const agentStatus = new Map<string, { description: string; startedAt: number }>();

  for await (const message of stream) {
    // 监控子 Agent 启动
    if (message.type === "system") {
      const sysMsg = message as { subtype?: string; task_id?: string; description?: string; task_type?: string; summary?: string; status?: string; last_tool_name?: string };

      if (sysMsg.subtype === "task_started" && sysMsg.task_id) {
        agentStatus.set(sysMsg.task_id, {
          description: sysMsg.description ?? "工作中",
          startedAt: Date.now(),
        });
        console.log(`[启动] ${sysMsg.description ?? sysMsg.task_id}`);
      }

      // 子 Agent 进度更新
      if (sysMsg.subtype === "task_progress" && sysMsg.task_id) {
        const agent = agentStatus.get(sysMsg.task_id);
        const tool = sysMsg.last_tool_name ? ` (使用 ${sysMsg.last_tool_name})` : "";
        if (agent) {
          const elapsed = Math.round((Date.now() - agent.startedAt) / 1000);
          console.log(`[进度] ${agent.description}${tool} - ${elapsed}s`);
        }
      }

      // 子 Agent 完成
      if (sysMsg.subtype === "task_notification" && sysMsg.task_id) {
        const agent = agentStatus.get(sysMsg.task_id);
        const desc = agent?.description ?? sysMsg.task_id;
        const elapsed = agent ? Math.round((Date.now() - agent.startedAt) / 1000) : "?";
        console.log(`[完成] ${desc} - 耗时 ${elapsed}s`);
        if (sysMsg.summary) {
          console.log(`       摘要: ${sysMsg.summary.slice(0, 120)}...`);
        }
        agentStatus.delete(sysMsg.task_id);
      }
    }

    // 输出 Lead Agent 的文本
    if (message.type === "stream_event") {
      const event = (message as { event: { type: string; delta?: { type: string; text?: string } } }).event;
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta" &&
        event.delta.text
      ) {
        process.stdout.write(event.delta.text);
      }
    }

    // 最终结果
    if (message.type === "result") {
      const result = message as { duration_ms?: number; num_turns?: number; total_cost_usd?: number };
      console.log("\n\n--- 执行完成 ---");
      console.log(`总耗时: ${((result.duration_ms ?? 0) / 1000).toFixed(1)}s`);
      console.log(`总轮次: ${result.num_turns ?? 0}`);
      console.log(`总费用: $${(result.total_cost_usd ?? 0).toFixed(4)}`);
    }
  }
}

// ============================================================
// 主函数
// ============================================================

async function main() {
  // 构建一个严格审查模式的 Team
  const team = buildTeam(true);

  // 定义任务
  const task = [
    "请对这个项目进行全面的分析和改进：",
    "",
    "1. explorer：分析项目的整体架构，找出核心模块和入口文件",
    "2. reviewer：严格审查核心模块的代码质量，重点关注安全问题",
    "3. tester：为最关键的模块编写单元测试",
    "4. docWriter：为项目的公共 API 编写使用文档",
    "",
    "请尽可能并行执行这些任务。",
  ].join("\n");

  await runTeamTask(task, team);
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
