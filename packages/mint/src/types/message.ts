/** Error codes sent from backend to frontend for classified error display */
export type StreamErrorCode =
  | 'RATE_LIMITED'
  | 'AUTH_ERROR'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'question' | 'answer';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
  skillLoads?: SkillLoadInfo[];
  todos?: TodoItem[];
  attachments?: Attachment[];
  /** Extended Thinking content from model */
  thinkingContent?: string;
  /** Whether this message was generated in plan mode */
  isPlanMode?: boolean;
  /** For role='question': the question data */
  questionData?: AskQuestionItem[];
  /** For role='answer': the selected answers */
  answerData?: Record<string, string>;
  /** If message contains an error, the classified error info */
  errorInfo?: { code: StreamErrorCode; message: string };
  /** Agent ID if this message was produced by a team agent */
  agentId?: string;
  /** Agent display name for team agent messages */
  agentName?: string;
  /** Agent avatar color for team agent messages */
  agentAvatar?: string;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'running' | 'completed' | 'error';
  startedAt?: number;
  completedAt?: number;
}

export interface SkillLoadInfo {
  id: string;
  name: string;
  description: string;
  status: 'loaded';
}

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export type StreamEventType =
  | 'content'
  | 'thinking'
  | 'tool_start'
  | 'tool_result'
  | 'skill_load'
  | 'todo_update'
  | 'permission_request'
  | 'plan_result'
  | 'teammate_started'
  | 'teammate_progress'
  | 'teammate_completed'
  | 'team_waiting_resume'
  | 'result'
  | 'error';

export interface AskQuestionOption {
  label: string;
  description?: string;
}

export interface AskQuestionItem {
  question: string;
  header: string;
  options: AskQuestionOption[];
  multiSelect: boolean;
}

export interface PermissionRequestData {
  requestId: string;
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  decisionReason?: string;
}

export interface StreamEventData {
  type: StreamEventType;
  data: string;
  sessionId?: string;
  toolName?: string;
  toolId?: string;
  toolArgs?: Record<string, unknown>;
  skillName?: string;
  skillDescription?: string;
  todos?: TodoItem[];
  requestId?: string;
  decisionReason?: string;
  suggestions?: unknown[];
  /** Incremental thinking content for Extended Thinking */
  thinkingDelta?: string;
  /** Whether the current session is running in plan mode */
  isPlanMode?: boolean;
  /** Classified error code for frontend display */
  errorCode?: StreamErrorCode;
  /** Teammate state for teammate_* events */
  teammate?: import('./team').TeammateState;
}

export interface StreamResult {
  role: 'assistant';
  content: string;
  model: string;
  sessionId?: string;
  costUsd?: number;
  durationMs?: number;
  durationApiMs?: number;
  numTurns?: number;
  tokens?: number;
}

export interface AgentEvent {
  type: 'assistant' | 'tool_use' | 'tool_result' | 'result';
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
}
