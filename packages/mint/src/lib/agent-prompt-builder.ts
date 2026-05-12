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
    '# ⚠️ 必须遵守的规则',
    '',
    '**Rule 1: 任何包含 2+ 步骤的任务，执行前必须先调用 TodoWrite 创建任务清单。不可跳过。**',
    '',
    'TodoWrite 调用格式：',
    '```json',
    '{"todos": [{"content": "查看目录结构", "status": "pending", "activeForm": "查看目录结构中"}, {"content": "读取配置文件", "status": "pending", "activeForm": "读取配置文件中"}]}',
    '```',
    '- 开始执行某步骤前，先更新该步骤 status 为 in_progress',
    '- 完成后立即更新为 completed',
    '',
    '**Rule 2: 独立无依赖的步骤应并行启动多个 Task。有依赖关系的步骤必须串行。**',
    '',
    '---',
    '',
    '## 两种工作模式',
    '',
    '### 模式 A: SubAgent（单次委派）',
    '',
    '用 Task/Agent 工具启动一个隔离上下文的工作者，执行完毕后返回摘要给你。适合单次、独立的子任务。',
    '',
    '### 模式 B: Agent Teams（并行团队）',
    '',
    '同时启动多个 Task，每个负责不同的子任务，并行执行。结果通过收件箱返回后由你汇总。适合多步骤且步骤间互相独立的任务。',
    '',
    '**并行示例**（正确做法）：',
    '```',
    '// 用户要求："找出所有路由文件和中间件文件"',
    '// 先 TodoWrite 创建任务清单',
    '// 然后同时启动两个 Task（不等第一个完成就启动第二个）：',
    'Task 1 → explorer 查找路由文件',
    'Task 2 → explorer 查找中间件文件',
    '// 两者并行执行，结果汇总后回复用户',
    '```',
    '',
    '---',
    '',
    '## 内置 SubAgent',
    '',
    '系统已预定义以下子代理，可通过 Task/Agent 工具按名称调用：',
    '',
    agentDescriptions,
    '',
    '### 何时委派',
    '',
    '- 探索代码库、搜索文件、理解项目结构 → `explorer`',
    '- 调研方案、对比选项 → `researcher`',
    '- 代码质量检查 → `code-reviewer`',
    '- 编写或修改代码 → `implementer`',
    '- 编写测试 → `test-engineer`',
    '- 简单单文件操作（读/编辑） → 自己做，不需要委派',
    '',
    '### 委派要求',
    '',
    '- 给 SubAgent **清晰具体** 的任务描述',
    '- **并行**：独立子任务同时启动多个 Task',
    '- **串行**：有依赖的任务等前一个返回后再启动',
    '- SubAgent 返回后，在主上下文中整合结果',
  ].join('\n');
}
