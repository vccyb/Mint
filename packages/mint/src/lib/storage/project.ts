import { promises as fs } from 'fs';
import path from 'path';
import type { Project } from '@/types';

const DEFAULT_DATA: Project[] = [];

/** 工程（Agent 模式）存储 */
export class ProjectStorage {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'agent-projects.json');
  }

  async initialize(): Promise<void> {
    // 确保 dataDir 存在，在主存储类中处理
  }

  async read(): Promise<Project[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as Project[];
    } catch {
      return DEFAULT_DATA;
    }
  }

  async write(projects: Project[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(projects, null, 2));
  }

  /** 别名方法，兼容 API 调用 */
  async list(): Promise<Project[]> {
    return this.read();
  }

  /** 创建工程 - 兼容 API 调用 */
  async create(data: { name: string; projectPath?: string }): Promise<Project> {
    return this.addProject(data.name, data.projectPath || process.cwd());
  }

  async addProject(name: string, projectPath: string): Promise<Project> {
    const projects = await this.read();
    const project: Project = {
      id: `proj_${Date.now().toString(36)}`,
      name,
      projectPath,
      sessionIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    projects.push(project);
    await this.write(projects);
    return project;
  }

  async updateProject(projectId: string, partial: Partial<Omit<Project, 'id'>>): Promise<void> {
    const projects = await this.read();
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) return;
    projects[idx] = { ...projects[idx], ...partial, updatedAt: Date.now() };
    await this.write(projects);
  }

  async deleteProject(projectId: string): Promise<void> {
    const projects = await this.read();
    await this.write(projects.filter((p) => p.id !== projectId));
  }

  async getProject(projectId: string): Promise<Project | null> {
    const projects = await this.read();
    return projects.find((p) => p.id === projectId) || null;
  }

  async moveSessionToProject(sessionId: string, projectId: string | null): Promise<void> {
    const projects = await this.read();
    // Remove from all projects first
    for (const p of projects) {
      p.sessionIds = p.sessionIds.filter((id) => id !== sessionId);
    }
    // Add to target project if specified
    if (projectId) {
      const target = projects.find((p) => p.id === projectId);
      if (target) {
        target.sessionIds.push(sessionId);
        target.updatedAt = Date.now();
      }
    }
    await this.write(projects);
  }
}
