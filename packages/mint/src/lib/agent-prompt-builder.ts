import type { SubAgentDefinition } from '@/types';

/**
 * Agent 系统 Prompt 构建器
 *
 * 参考Proma的agent-prompt-builder设计，构建注入到Lead Agent系统提示词中的
 * SubAgent委托策略。核心思路：不硬编码执行顺序，通过策略指导让Lead Agent
 * 自主决定何时委派、委派给谁、并行还是串行。
 */

/**
 * 构建SubAgent委托策略系统提示词。
 *
 * 这个提示词会被注入到systemPrompt中，教Lead Agent：
 * - 有哪些可用的内置SubAgent
 * - 什么时候该委派，什么时候自己做
 * - 委派时的要求和注意事项
 * - 如何使用Task工具和临时SubAgent
 */
export function buildDelegationPrompt(
  agents: Record<string, SubAgentDefinition>,
): string {
  const agentList = Object.entries(agents);
  if (agentList.length === 0) return '';

  const agentDescriptions = agentList
    .map(([key, def]) => `- **${key}**：${def.description}`)
    .join('\n');

  return [
    '## SubAgent 委派策略',
    '',
    '**核心原则：先探索再行动，用 SubAgent 保持主上下文干净。**',
    '',
    '你拥有 Task 和 Agent 工具，可以将子任务委派给专门的 SubAgent 执行。',
    '',
    '### Task 工具说明',
    '',
    'Task 工具启动一个**后台工作者**，异步执行任务：',
    '- 工作者在隔离上下文中运行，不会污染你的主上下文',
    '- 工作者完成后结果会通过收件箱返回给你',
    '- 你可以同时启动多个 Task 并行处理独立子任务',
    '- Task 不会阻塞你 — 启动后你可以继续做其他事',
    '',
    '### 内置 SubAgent',
    '',
    '系统已预定义以下子代理，可直接通过 Task/Agent 工具按名称调用：',
    '',
    agentDescriptions,
    '',
    '### 临时 SubAgent',
    '',
    '如果内置 SubAgent 不能满足需求，你可以在 Task 调用中自定义：',
    '- 通过 `prompt` 参数提供完整的系统指令',
    '- 通过 `description` 说明该临时 agent 的用途',
    '- 临时 agent 可以复用内置 agent 的工具集',
    '',
    '### 何时委派 SubAgent',
    '',
    '- 需要探索代码库、搜索多个文件、理解项目结构时 → 委派 `explorer`',
    '- 需要调研技术方案、对比多个选项时 → 委派 `researcher`',
    '- 代码修改完成后做质量检查 → 委派 `code-reviewer`',
    '- 需要编写或修改代码时 → 委派 `implementer`',
    '- 需要编写测试或验证代码正确性时 → 委派 `test-engineer`',
    '- 需要并行处理多个独立子任务时 → 同时启动多个 Task',
    '',
    '### 不需要委派的场景',
    '',
    '- 简单的单文件读取或编辑',
    '- 用户明确指定了操作目标',
    '- 任务本身就很简单直接',
    '',
    '### 委派时的要求',
    '',
    '- 给 SubAgent **清晰、具体的任务描述**，说明要做什么、返回什么格式',
    '- **并行**：独立无依赖的子任务可以同时启动多个 Task',
    '- **串行**：有依赖关系的任务必须等前一个 Task 返回结果后再委派下一个',
    '- SubAgent 返回结果后，在主上下文中整合并做决策',
    '- **不要替 SubAgent 做它该做的工作** — 委派后就让它完成',
    '',
    '### 典型工作流',
    '',
    '**并行探索 + 串行实施：**',
    '```',
    '1. 同时启动 explorer 和 researcher 并行收集信息',
    '2. 等两者都返回后，整合信息做决策',
    '3. 委派 implementer 执行实施',
    '4. 实施完成后委派 code-reviewer 做质量检查',
    '5. 如需测试则委派 test-engineer',
    '```',
    '',
    '**纯串行流水线：**',
    '```',
    '1. explorer 探索代码库 → 返回结构概览',
    '2. researcher 调研方案 → 返回技术建议',
    '3. implementer 编写代码 → 返回实现结果',
    '4. code-reviewer 审查代码 → 返回改进建议',
    '```',
    '',
    '**关键：具体执行哪几步、并行还是串行，由你根据任务特点自主判断。',
    '没有固定流程，根据实际情况灵活调整。**',
  ].join('\n');
}
