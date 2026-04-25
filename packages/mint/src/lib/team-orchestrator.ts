import type { Team, AgentDefinition, TeamTask } from '@/types';
import { loadTeam, saveTeam, loadTeamsBySession } from '@/lib/storage/team';
import { createLogger } from '@/lib/logger';

const log = createLogger('team-orchestrator');

const AGENT_PRESETS: Record<string, { role: string; avatar: string; tools: string[] }> = {
  'security-reviewer': {
    role: 'Security Reviewer',
    avatar: '#34c759',
    tools: ['Read', 'Grep', 'Glob'],
  },
  'test-engineer': {
    role: 'Test Engineer',
    avatar: '#007aff',
    tools: ['Read', 'Write', 'Edit', 'Bash'],
  },
  'doc-writer': {
    role: 'Documentation Writer',
    avatar: '#af52de',
    tools: ['Read', 'Write', 'Edit'],
  },
  'code-reviewer': {
    role: 'Code Reviewer',
    avatar: '#ff9500',
    tools: ['Read', 'Grep', 'Glob'],
  },
  'implementer': {
    role: 'Implementer',
    avatar: '#007aff',
    tools: ['Read', 'Write', 'Edit', 'Bash'],
  },
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Analyze a prompt and generate a team definition.
 * In production, this would use the LLM to determine required agents.
 * For now, it uses simple heuristics based on keywords.
 */
export async function createTeam(
  sessionId: string,
  prompt: string,
): Promise<Team> {
  log.info('Creating team', { sessionId });

  const agents = determineAgents(prompt);
  const tasks = createTasks(prompt, agents);

  const team: Team = {
    id: `team_${generateId()}`,
    name: generateTeamName(prompt),
    description: prompt.slice(0, 200),
    agents,
    tasks,
    mailbox: [],
    status: 'forming',
    createdAt: Date.now(),
    completedAt: null,
    sessionId,
  };

  // Auto-activate if we have agents and tasks
  if (team.agents.length > 0 && team.tasks.length > 0) {
    team.status = 'active';
  }

  await saveTeam(team);
  log.info('Team created', { teamId: team.id, agentCount: agents.length, taskCount: tasks.length });

  return team;
}

function determineAgents(prompt: string): AgentDefinition[] {
  const lower = prompt.toLowerCase();
  const agents: AgentDefinition[] = [];

  if (lower.includes('security') || lower.includes('vulnerability') || lower.includes('安全')) {
    agents.push(createAgent('security-reviewer', '审查代码漏洞和安全问题'));
  }
  if (lower.includes('test') || lower.includes('测试')) {
    agents.push(createAgent('test-engineer', '编写和维护测试用例'));
  }
  if (lower.includes('doc') || lower.includes('文档') || lower.includes('document')) {
    agents.push(createAgent('doc-writer', '编写和更新文档'));
  }
  if (lower.includes('review') || lower.includes('审查') || lower.includes('重构')) {
    agents.push(createAgent('code-reviewer', '审查代码质量和最佳实践'));
  }
  if (lower.includes('implement') || lower.includes('build') || lower.includes('实现') || lower.includes('开发')) {
    agents.push(createAgent('implementer', '实现功能和编写代码'));
  }

  // Default: single implementer agent
  if (agents.length === 0) {
    agents.push(createAgent('implementer', '完成指定任务'));
  }

  return agents;
}

function createAgent(presetName: string, instructions: string): AgentDefinition {
  const preset = AGENT_PRESETS[presetName] ?? AGENT_PRESETS['implementer']!;
  return {
    id: `agent_${generateId()}`,
    name: presetName,
    role: preset.role,
    avatar: preset.avatar,
    instructions,
    tools: preset.tools,
    status: 'idle',
    currentTaskId: null,
    startedAt: null,
    completedAt: null,
  };
}

function createTasks(_prompt: string, agents: AgentDefinition[]): TeamTask[] {
  const tasks: TeamTask[] = [];

  for (const agent of agents) {
    let title = `Execute ${agent.role} duties`;
    let description = agent.instructions;

    if (agent.name === 'security-reviewer') {
      title = '审查代码安全漏洞';
      description = '审查代码中的安全漏洞，包括 XSS、SQL 注入、认证问题等';
    } else if (agent.name === 'test-engineer') {
      title = '编写测试用例';
      description = '编写覆盖安全场景和功能需求的测试用例';
    } else if (agent.name === 'doc-writer') {
      title = '更新文档';
      description = '更新相关文档，记录变更和安全最佳实践';
    } else if (agent.name === 'code-reviewer') {
      title = '代码审查';
      description = '审查代码质量和是否符合最佳实践';
    }

    const task: TeamTask = {
      id: `task_${generateId()}`,
      title,
      description,
      assigneeId: agent.id,
      status: 'pending',
      startedAt: null,
      completedAt: null,
    };
    tasks.push(task);

    // Link task to agent
    agent.currentTaskId = task.id;
  }

  return tasks;
}

function generateTeamName(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('security') || lower.includes('安全')) return 'security-fix';
  if (lower.includes('refactor') || lower.includes('重构')) return 'refactor';
  if (lower.includes('test') || lower.includes('测试')) return 'test-suite';
  if (lower.includes('doc') || lower.includes('文档')) return 'documentation';
  return `task-${Date.now().toString(36)}`;
}

export async function monitorTeam(teamId: string): Promise<Team | null> {
  const team = await loadTeam(teamId);
  if (!team) return null;

  const allCompleted = team.agents.every(
    (a) => a.status === 'completed' || a.status === 'error',
  );
  const hasError = team.agents.some((a) => a.status === 'error');

  if (allCompleted && team.status === 'active') {
    team.status = hasError ? 'error' : 'completed';
    team.completedAt = Date.now();
    await saveTeam(team);
    log.info('Team completed', { teamId, status: team.status });
  }

  return team;
}

export async function completeTeam(teamId: string): Promise<Team | null> {
  const team = await loadTeam(teamId);
  if (!team) return null;

  team.status = 'completed';
  team.completedAt = Date.now();
  await saveTeam(team);
  log.info('Team manually completed', { teamId });
  return team;
}

export { loadTeam, loadTeamsBySession };
