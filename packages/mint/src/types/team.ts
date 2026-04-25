export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'error';
export type TeamStatus = 'forming' | 'active' | 'completed' | 'error';

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  avatar: string;
  instructions: string;
  tools: string[];
  status: AgentStatus;
  currentTaskId: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface TeamTask {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  result?: string;
  toolsUsed?: string[];
  startedAt: number | null;
  completedAt: number | null;
}

export interface MailboxMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | '*';
  content: string;
  timestamp: number;
  type: 'info' | 'question' | 'result' | 'handoff';
}

export interface Team {
  id: string;
  name: string;
  description: string;
  agents: AgentDefinition[];
  tasks: TeamTask[];
  mailbox: MailboxMessage[];
  status: TeamStatus;
  createdAt: number;
  completedAt: number | null;
  sessionId: string;
}
