/**
 * Project & Thread 类型定义
 * 参考 Codex 的工程化设计
 */

/** 工程类型 */
export type ProjectType = 'project';

/** 线程类型 */
export type ThreadType = 'thread';

/** 工程或线程的统一类型 */
export type ThreadItemType = ProjectType | ThreadType;

/** 工程信息 - 一个项目容器 */
export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  /** 项目路径，用于文件树展示 */
  projectPath?: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 是否置顶 */
  pinned?: boolean;
  /** 置顶时间 */
  pinnedAt?: number;
}

/** 线程信息 - 一个对话线程 */
export interface Thread {
  id: string;
  title: string;
  type: ThreadType;
  /** 所属工程 ID，如果为 null 则为独立对话 */
  projectId: string | null;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 消息数量 */
  messageCount: number;
  /** 是否置顶 */
  pinned?: boolean;
  /** 置顶时间 */
  pinnedAt?: number;
  /** 模式 */
  mode: 'chat' | 'agent';
  /** 使用的模型 */
  model: string;
}

/** 左侧列表项 - 工程或线程 */
export interface ThreadItem {
  id: string;
  type: ThreadItemType;
  title: string;
  /** 时间标签，如 "16h", "2d", "8h" */
  timeLabel?: string;
  /** 所属工程 ID（仅线程有） */
  projectId?: string | null;
  /** 是否展开（仅工程） */
  expanded?: boolean;
  /** 子线程列表（仅工程） */
  children?: ThreadItem[];
  /** 是否置顶 */
  pinned?: boolean;
}

/** 文件变更类型 */
export type FileChangeType = 'created' | 'edited' | 'deleted';

/** 单个文件变更记录 */
export interface FileChange {
  id: string;
  /** 线程 ID */
  threadId: string;
  /** 文件路径 */
  filePath: string;
  /** 变更类型 */
  changeType: FileChangeType;
  /** 增加的行数 */
  additions: number;
  /** 删除的行数 */
  deletions: number;
  /** 变更时间 */
  timestamp: number;
}

/** 文件变更总结 */
export interface FileChangeSummary {
  /** 变更文件数 */
  fileCount: number;
  /** 总增加行数 */
  totalAdditions: number;
  /** 总删除行数 */
  totalDeletions: number;
}
