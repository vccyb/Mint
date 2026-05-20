export interface SessionGroup {
  id: string;
  name: string;
  sessionIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** 工程（Agent 模式）- 扩展 SessionGroup，添加项目路径 */
export interface Project {
  id: string;
  name: string;
  /** 本地项目路径 */
  projectPath: string;
  sessionIds: string[];
  createdAt: number;
  updatedAt: number;
}
