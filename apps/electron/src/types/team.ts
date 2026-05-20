// --- SDK-aligned types for real subagent execution ---

/** SDK AgentDefinition shape for use with query({ agents }) */
export interface SubAgentDefinition {
  /** Agent identifier used in the agents map key */
  name: string;
  /** When to use this agent — SDK uses this for automatic routing */
  description: string;
  /** System prompt for the subagent */
  prompt: string;
  /** Allowed tools for this subagent */
  tools?: string[];
  /** Model override: sonnet | opus | haiku | inherit */
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
}

/** Real-time status of a teammate (worker agent) during execution */
export type TeammateStatus = 'running' | 'completed' | 'failed' | 'stopped';

export interface TeammateState {
  taskId: string;
  toolUseId?: string;
  description: string;
  /** Full prompt/instruction from lead agent to this teammate */
  prompt?: string;
  taskType?: string;
  index: number;
  status: TeammateStatus;
  progressDescription?: string;
  currentToolName?: string;
  currentToolElapsedSeconds?: number;
  toolHistory: string[];
  summary?: string;
  outputFile?: string;
  usage?: { totalTokens?: number; toolUses?: number; durationMs?: number };
  startedAt: number;
  endedAt?: number;
}
