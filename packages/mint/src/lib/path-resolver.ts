import { resolve, join } from 'path';
import { homedir } from 'os';
import { access } from 'fs/promises';
import { getStorage } from './storage';

export interface PathContext {
  projectId?: string;
  fallbackPath?: string;
}

/**
 * 解析项目路径为实际文件系统路径
 * @param context - 路径上下文
 * @returns 解析后的绝对路径
 */
export async function resolveProjectPath(context: PathContext): Promise<string> {
  const { projectId, fallbackPath } = context;

  // 如果没有 projectId，使用 fallback 或 MINT_CWD
  if (!projectId) {
    return fallbackPath || process.env.MINT_CWD || process.cwd();
  }

  // 获取项目信息
  const storage = getStorage();
  await storage.initialize();
  const projects = await storage.projects.list();
  const project = projects.find((p) => p.id === projectId);

  if (!project?.projectPath) {
    return fallbackPath || process.env.MINT_CWD || process.cwd();
  }

  // 空路径或当前目录，返回 fallback
  if (!project.projectPath || project.projectPath === '.') {
    return fallbackPath || process.env.MINT_CWD || process.cwd();
  }

  // 直接解析为绝对路径
  let resolvedPath = resolve(project.projectPath);

  // 检查路径是否存在
  try {
    await access(resolvedPath);
    return resolvedPath;
  } catch {
    // 路径不存在，尝试其他位置
    const cwdPath = resolve(process.cwd(), project.projectPath);
    const homePath = resolve(homedir(), project.projectPath);
    const mintPath = resolve(process.env.MINT_CWD || process.cwd(), project.projectPath);

    const paths = [cwdPath, homePath, mintPath];
    for (const path of paths) {
      try {
        await access(path);
        resolvedPath = path;
        break;
      } catch {
        // 继续尝试下一个
      }
    }
  }

  return resolvedPath;
}
