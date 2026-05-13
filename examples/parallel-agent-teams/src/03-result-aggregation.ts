/**
 * 03-result-aggregation.ts
 *
 * 展示并行 Agent 完成后如何收集、汇总和整合结果。
 *
 * 本示例涵盖：
 * 1. 监听子 Agent 的完成通知（task_notification）
 * 2. 收集每个子 Agent 的摘要和输出
 * 3. 使用 session resume 机制获取完整结果
 * 4. 生成结构化的最终报告
 *
 * 运行：npx tsx src/03-result-aggregation.ts
 */

import { query } from "@anthropic-ai/claude-agent-sdk";

// ============================================================
// 结果收集器
// ============================================================
// 用于在流式处理过程中收集各子 Agent 的结果

interface AgentResult {
  /** 子 Agent 的任务 ID */
  taskId: string;
  /** 任务描述 */
  description: string;
  /** 执行状态 */
  status: "running" | "completed" | "failed" | "stopped";
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** 结果摘要 */
  summary: string;
  /** 使用的工具历史 */
  toolHistory: string[];
  /** Token 用量 */
  totalTokens?: number;
  /** 完成时间戳 */
  completedAt?: number;
}

/**
 * 结果收集器：在流式消息处理过程中累积各 Agent 的结果
 */
class ResultCollector {
  private results = new Map<string, AgentResult>();
  private startTimes = new Map<string, number>();
  private toolHistories = new Map<string, string[]>();

  /** 记录子 Agent 启动 */
  recordStart(taskId: string, description: string): void {
    this.startTimes.set(taskId, Date.now());
    this.toolHistories.set(taskId, []);
    this.results.set(taskId, {
      taskId,
      description,
      status: "running",
      durationMs: 0,
      summary: "",
      toolHistory: [],
    });
  }

  /** 记录子 Agent 的工具使用 */
  recordToolUse(taskId: string, toolName: string): void {
    const history = this.toolHistories.get(taskId) ?? [];
    if (history[history.length - 1] !== toolName) {
      history.push(toolName);
    }
    this.toolHistories.set(taskId, history);
  }

  /** 记录子 Agent 完成 */
  recordCompletion(
    taskId: string,
    status: string,
    summary: string,
    usage?: { total_tokens?: number; tool_uses?: number; duration_ms?: number },
  ): void {
    const existing = this.results.get(taskId);
    const startTime = this.startTimes.get(taskId) ?? Date.now();

    const result: AgentResult = {
      taskId,
      description: existing?.description ?? taskId,
      status: (status === "failed" ? "failed" : status === "stopped" ? "stopped" : "completed") as AgentResult["status"],
      durationMs: usage?.duration_ms ?? (Date.now() - startTime),
      summary,
      toolHistory: [...(this.toolHistories.get(taskId) ?? [])],
      totalTokens: usage?.total_tokens,
      completedAt: Date.now(),
    };

    this.results.set(taskId, result);
  }

  /** 获取所有已完成的 Agent 结果 */
  getCompletedResults(): AgentResult[] {
    return Array.from(this.results.values()).filter(
      (r) => r.status === "completed" || r.status === "failed" || r.status === "stopped",
    );
  }

  /** 获取当前仍在运行的 Agent 数量 */
  getRunningCount(): number {
    return Array.from(this.results.values()).filter((r) => r.status === "running").length;
  }

  /** 获取所有结果 */
  getAllResults(): AgentResult[] {
    return Array.from(this.results.values());
  }

  /** 生成汇总报告 */
  generateSummaryReport(): string {
    const completed = this.getCompletedResults();
    const running = this.getRunningCount();

    const lines: string[] = [
      "========================================",
      "  并行 Agent 执行报告",
      "========================================",
      "",
      `总计: ${this.results.size} 个 Agent`,
      `已完成: ${completed.length}`,
      `运行中: ${running}`,
      "",
    ];

    // 逐个 Agent 输出结果
    for (const result of this.results.values()) {
      const statusIcon =
        result.status === "completed" ? "[OK]" :
        result.status === "failed" ? "[FAIL]" :
        result.status === "stopped" ? "[STOP]" :
        "[...]";

      lines.push(`--- ${statusIcon} ${result.description} ---`);
      lines.push(`  任务 ID: ${result.taskId}`);
      lines.push(`  状态: ${result.status}`);
      lines.push(`  耗时: ${(result.durationMs / 1000).toFixed(1)}s`);

      if (result.totalTokens) {
        lines.push(`  Token 用量: ${result.totalTokens}`);
      }

      if (result.toolHistory.length > 0) {
        lines.push(`  工具调用: ${result.toolHistory.join(" -> ")}`);
      }

      if (result.summary) {
        // 截断过长的摘要
        const truncated = result.summary.length > 200
          ? result.summary.slice(0, 200) + "..."
          : result.summary;
        lines.push(`  摘要: ${truncated}`);
      }

      lines.push("");
    }

    // 汇总统计
    if (completed.length > 0) {
      const totalDuration = Math.max(...completed.map((r) => r.durationMs));
      const totalTokens = completed.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0);
      const allTools = completed.flatMap((r) => r.toolHistory);

      lines.push("--- 统计 ---");
      lines.push(`  实际耗时（并行）: ${(totalDuration / 1000).toFixed(1)}s`);
      lines.push(`  总 Token 用量: ${totalTokens}`);
      lines.push(`  工具调用总次数: ${allTools.length}`);
      lines.push(`  使用过的工具: ${[...new Set(allTools)].join(", ")}`);
    }

    lines.push("========================================");

    return lines.join("\n");
  }
}

// ============================================================
// Agent 定义（与 01 类似，但更简化）
// ============================================================

const agents = {
  explorer: {
    description: "代码库探索和结构分析。",
    prompt: "你是一个代码库探索员。快速分析项目结构并提供总结。",
    tools: ["Read", "Glob", "Grep", "Bash"],
  },
  researcher: {
    description: "技术调研和方案分析。",
    prompt: "你是一个技术调研员。调研技术方案并提供分析报告。",
    tools: ["Read", "Glob", "Grep", "Bash", "WebSearch", "WebFetch"],
  },
  "code-reviewer": {
    description: "代码质量审查。",
    prompt: "你是一个代码审查员。审查代码质量并提供改进建议。",
    tools: ["Read", "Glob", "Grep", "Bash"],
  },
};

// ============================================================
// 主流程：执行并行任务并收集结果
// ============================================================

async function main() {
  console.log("=== 并行 Agent 结果汇总示例 ===\n");

  const collector = new ResultCollector();

  const task = [
    "请并行执行以下三个分析任务：",
    "",
    "1. explorer: 分析项目的目录结构和核心模块",
    "2. researcher: 调研项目的技术栈和主要依赖",
    "3. code-reviewer: 审查 src 目录下的核心代码质量",
    "",
    "请并行启动这三个 Agent，收集结果后生成汇总报告。",
  ].join("\n");

  console.log("任务:", task.slice(0, 60), "...\n");

  // 记录 session ID 以便后续 resume
  let sessionId: string | undefined;

  const stream = query({
    prompt: task,
    options: {
      allowedTools: ["Read", "Glob", "Grep", "Bash", "Agent"],
      agents,
      includePartialMessages: true,
    },
  });

  for await (const message of stream) {
    // 捕获 session ID
    if (message.type === "system") {
      const sysMsg = message as { subtype?: string; session_id?: string; task_id?: string; description?: string; task_type?: string; summary?: string; status?: string; last_tool_name?: string; usage?: { total_tokens?: number; tool_uses?: number; duration_ms?: number } };

      if (sysMsg.subtype === "init" && sysMsg.session_id) {
        sessionId = sysMsg.session_id;
        console.log(`Session ID: ${sessionId}\n`);
      }

      // 子 Agent 启动
      if (sysMsg.subtype === "task_started" && sysMsg.task_id) {
        collector.recordStart(sysMsg.task_id, sysMsg.description ?? "执行中");
        console.log(`[启动] ${sysMsg.description ?? sysMsg.task_id}`);
      }

      // 子 Agent 进度
      if (sysMsg.subtype === "task_progress" && sysMsg.task_id && sysMsg.last_tool_name) {
        collector.recordToolUse(sysMsg.task_id, sysMsg.last_tool_name);
      }

      // 子 Agent 完成
      if (sysMsg.subtype === "task_notification" && sysMsg.task_id) {
        collector.recordCompletion(
          sysMsg.task_id,
          sysMsg.status ?? "completed",
          sysMsg.summary ?? "",
          sysMsg.usage,
        );
        console.log(`[完成] ${sysMsg.status ?? "completed"}`);
      }
    }

    // 输出 Lead Agent 文本
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
      const result = message as { duration_ms?: number; total_cost_usd?: number };
      console.log("\n");
      console.log(collector.generateSummaryReport());
      console.log(`\nSDK 层面总耗时: ${((result.duration_ms ?? 0) / 1000).toFixed(1)}s`);
      console.log(`SDK 层面总费用: $${(result.total_cost_usd ?? 0).toFixed(4)}`);
    }
  }

  // ============================================================
  // 结果后处理：展示如何用 session resume 做进一步分析
  // ============================================================

  const completedResults = collector.getCompletedResults();

  if (sessionId && completedResults.length > 0) {
    console.log("\n\n=== 结果后处理 ===\n");
    console.log(`已收集 ${completedResults.length} 个子 Agent 的结果`);

    // 使用 resume 继续对话，让 Lead Agent 基于已有结果做深入分析
    console.log("通过 session resume 进行结果整合...\n");

    const resumeStream = query({
      prompt: [
        "基于刚才三个 Agent 的分析结果，请：",
        "1. 整合所有发现，去除重复",
        "2. 按优先级排列发现的问题",
        "3. 给出 3-5 条最关键的改进建议",
      ].join("\n"),
      options: {
        resume: sessionId,
        allowedTools: ["Read", "Glob", "Grep", "Bash", "Agent"],
        agents,
        includePartialMessages: true,
      },
    });

    for await (const message of resumeStream) {
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

      if (message.type === "result") {
        console.log("\n\n--- 后处理完成 ---");
      }
    }
  }
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
