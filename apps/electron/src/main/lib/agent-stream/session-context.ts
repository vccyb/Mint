import type { ToolCallInfo, SkillLoadInfo, TodoItem } from '../../../types';
import type { Logger } from '../logger';

/**
 * Mutable session state for a single agent stream.
 * Replaces the previous pattern of 20+ `{ value: T }` wrapper objects.
 */
export class SessionStreamState {
  sessionId: string;
  isPlanMode: boolean;
  log: Logger;

  // --- content accumulators ---
  assistantContent = '';
  thinkingContent = '';
  toolCalls: ToolCallInfo[] = [];
  skillLoads: SkillLoadInfo[] = [];

  // --- current tool tracking ---
  currentToolId: string | null = null;
  currentToolName: string | null = null;
  currentToolInput = '';

  // --- tool sets ---
  todoWriteToolIds: Set<string> = new Set();
  taskToolIds: Set<string> = new Set();
  startedTaskIds: Set<string> = new Set();

  // --- teammate tracking ---
  teammateIndexMap: Map<string, number> = new Map();
  teammateStartTimes: Map<string, number> = new Map();
  teammateDescriptions: Map<string, string> = new Map();
  teammateToolHistories: Map<string, string[]> = new Map();
  teammatePrompts: Map<string, string> = new Map();
  nextTeammateIndex = 0;

  // --- bridge data: content-handler → teammate-handler ---
  // Maps tool_use_id (from content-handler) to data for use by
  // teammate-handler when task_started arrives with the real task_id.
  pendingTaskDescriptions: Map<string, string> = new Map(); // toolUseId → description
  pendingTaskStartTimes: Map<string, number> = new Map(); // toolUseId → startTime
  pendingTaskToTaskId: Map<string, string> = new Map(); // toolUseId → taskId
  pendingTaskInputs: Map<string, string> = new Map(); // toolUseId → full prompt

  // --- SDK session ---
  capturedSdkSessionId: string | null = null;
  deferredResultMessage: unknown = null;

  // --- summaries for fallback resume ---
  taskNotificationSummaries: Array<{
    taskId: string;
    summary: string;
    status?: string;
  }> = [];

  // --- todos ---
  latestTodos: TodoItem[] = [];

  // --- skills ---
  skillPathMap: Map<string, { name: string; description: string }>;
  skillsEnabled: boolean;

  constructor(opts: {
    sessionId: string;
    isPlanMode: boolean;
    log: Logger;
    skillPathMap: Map<string, { name: string; description: string }>;
    skillsEnabled: boolean;
  }) {
    this.sessionId = opts.sessionId;
    this.isPlanMode = opts.isPlanMode;
    this.log = opts.log;
    this.skillPathMap = opts.skillPathMap;
    this.skillsEnabled = opts.skillsEnabled;
  }
}
