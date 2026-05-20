import type { StreamErrorCode, TodoItem } from './message';
import type { TeammateState } from './team';

// ─── Base ───

interface BaseEvent {
  sessionId?: string;
}

// ─── Content stream events ───

export interface ContentEvent extends BaseEvent {
  type: 'content';
  data: string;
  isPlanMode?: boolean;
}

export interface ThinkingEvent extends BaseEvent {
  type: 'thinking';
  thinkingDelta: string;
}

export interface ToolStartEvent extends BaseEvent {
  type: 'tool_start';
  toolName: string;
  toolId: string;
  toolArgs: Record<string, unknown>;
}

export interface ToolResultEvent extends BaseEvent {
  type: 'tool_result';
  data: string;
  toolId: string;
}

export interface SkillLoadEvent extends BaseEvent {
  type: 'skill_load';
  skillName: string;
  skillDescription: string;
}

export interface TodoUpdateEvent extends BaseEvent {
  type: 'todo_update';
  todos: TodoItem[];
}

export interface PermissionRequestEvent extends BaseEvent {
  type: 'permission_request';
  requestId: string;
  toolName: string;
  toolId: string;
  toolArgs: Record<string, unknown>;
  decisionReason?: string;
}

export interface PlanResultEvent extends BaseEvent {
  type: 'plan_result';
  data: string;
}

// ─── Team events ───

export interface TeammateStartedEvent extends BaseEvent {
  type: 'teammate_started';
  teammate: TeammateState;
}

export interface TeammateProgressEvent extends BaseEvent {
  type: 'teammate_progress';
  teammate: TeammateState;
}

export interface TeammateCompletedEvent extends BaseEvent {
  type: 'teammate_completed';
  teammate: TeammateState;
}

export interface TeamWaitingResumeEvent extends BaseEvent {
  type: 'team_waiting_resume';
}

// ─── Context window events ───

export interface UsageUpdateEvent extends BaseEvent {
  type: 'usage_update';
  inputTokens: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  contextWindow?: number;
}

export interface CompactingEvent extends BaseEvent {
  type: 'compacting';
}

export interface CompactCompleteEvent extends BaseEvent {
  type: 'compact_complete';
}

// ─── Terminal events ───

export interface ResultEvent extends BaseEvent {
  type: 'result';
  data: string;
  isPlanMode?: boolean;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  data: string;
  errorCode?: StreamErrorCode;
}

// ─── Discriminated union ───

export type StreamEvent =
  | ContentEvent
  | ThinkingEvent
  | ToolStartEvent
  | ToolResultEvent
  | SkillLoadEvent
  | TodoUpdateEvent
  | PermissionRequestEvent
  | PlanResultEvent
  | TeammateStartedEvent
  | TeammateProgressEvent
  | TeammateCompletedEvent
  | TeamWaitingResumeEvent
  | UsageUpdateEvent
  | CompactingEvent
  | CompactCompleteEvent
  | ResultEvent
  | ErrorEvent;
