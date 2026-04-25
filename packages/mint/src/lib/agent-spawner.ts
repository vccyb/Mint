import type { AgentDefinition } from '@/types';
import { loadTeam, saveTeam } from '@/lib/storage/team';
import { createLogger } from '@/lib/logger';

const log = createLogger('agent-spawner');

export interface SpawnedAgent {
  agentId: string;
  teamId: string;
  status: 'running';
  startedAt: number;
}

/**
 * Stub implementation of AgentSpawner.
 * In production, this would use the Claude Agent SDK `query()` method
 * to spawn a child agent with the agent's instructions and tools.
 *
 * The real implementation would look something like:
 *   import { query } from '@anthropic-ai/claude-code';
 *   const result = await query({
 *     prompt: agent.instructions,
 *     options: { allowedTools: agent.tools },
 *   });
 */

export async function spawnAgent(
  teamId: string,
  agentDefinition: AgentDefinition,
): Promise<SpawnedAgent> {
  log.info('Spawning agent', { teamId, agentId: agentDefinition.id, agentName: agentDefinition.name });

  const team = await loadTeam(teamId);
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  // Update agent status to running
  const agentIndex = team.agents.findIndex((a) => a.id === agentDefinition.id);
  if (agentIndex === -1) {
    throw new Error(`Agent ${agentDefinition.id} not found in team ${teamId}`);
  }

  const now = Date.now();
  team.agents[agentIndex] = {
    ...team.agents[agentIndex],
    status: 'running',
    startedAt: now,
  };

  // Mark assigned task as in_progress
  if (team.agents[agentIndex].currentTaskId) {
    const taskIndex = team.tasks.findIndex(
      (t) => t.id === team.agents[agentIndex].currentTaskId,
    );
    if (taskIndex !== -1) {
      team.tasks[taskIndex] = {
        ...team.tasks[taskIndex],
        status: 'in_progress',
        startedAt: now,
      };
    }
  }

  await saveTeam(team);

  // TODO: Replace with real Claude Agent SDK integration
  // Simulate async agent completion after a delay
  simulateAgentCompletion(teamId, agentDefinition.id);

  return {
    agentId: agentDefinition.id,
    teamId,
    status: 'running',
    startedAt: now,
  };
}

export async function terminateAgent(
  teamId: string,
  agentId: string,
): Promise<void> {
  log.info('Terminating agent', { teamId, agentId });

  const team = await loadTeam(teamId);
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  const agentIndex = team.agents.findIndex((a) => a.id === agentId);
  if (agentIndex === -1) {
    throw new Error(`Agent ${agentId} not found in team ${teamId}`);
  }

  team.agents[agentIndex] = {
    ...team.agents[agentIndex],
    status: 'completed',
    completedAt: Date.now(),
  };

  await saveTeam(team);
}

/**
 * Mock: simulate an agent completing its task after a delay.
 * This will be replaced with real Claude Agent SDK integration.
 */
function simulateAgentCompletion(teamId: string, agentId: string): void {
  const delay = 3000 + Math.random() * 5000;
  setTimeout(async () => {
    try {
      const team = await loadTeam(teamId);
      if (!team) return;

      const agentIndex = team.agents.findIndex((a) => a.id === agentId);
      if (agentIndex === -1 || team.agents[agentIndex].status !== 'running') return;

      team.agents[agentIndex] = {
        ...team.agents[agentIndex],
        status: 'completed',
        completedAt: Date.now(),
      };

      const taskId = team.agents[agentIndex].currentTaskId;
      if (taskId) {
        const taskIndex = team.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex !== -1) {
          team.tasks[taskIndex] = {
            ...team.tasks[taskIndex],
            status: 'completed',
            completedAt: Date.now(),
            result: `[Simulated] Task completed by ${team.agents[agentIndex].name}`,
          };
        }
      }

      await saveTeam(team);
      log.info('Simulated agent completion', { teamId, agentId });
    } catch (error) {
      log.error('Simulated agent completion failed', {
        teamId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, delay);
}
