import type { ToolCallInfo, SkillLoadInfo, TodoItem } from '@/types';

/**
 * Mutable session state for a single agent stream.
 * Replaces the previous pattern of 20+ `{ value: T }` wrapper objects.
 */
export class SessionStreamState {
  sessionId: string;
  isPlanMode: boolean;
  log: { info: (msg: string, data?: Record<string, unknown>) => void };

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
  nextTeammateIndex = 0;

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
    log: { info: (msg: string, data?: Record<string, unknown>) => void };
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
