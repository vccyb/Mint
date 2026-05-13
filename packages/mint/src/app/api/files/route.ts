import { readdir, stat, readFile, access } from 'fs/promises';
import { join, relative, basename, resolve } from 'path';
import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { homedir } from 'os';
import { withLogging } from '@/lib/with-logging';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

// Common directories/files to skip
const IGNORE = new Set([
  'node_modules',
  '.git',
  '.next',
  '.DS_Store',
  'dist',
  '.turbo',
  '__pycache__',
  '.cache',
  '.data',
]);

const MAX_DEPTH = 3;

async function readTree(dir: string, root: string, depth: number): Promise<FileNode[]> {
  if (depth > MAX_DEPTH) return [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  // Sort: directories first, then files; alphabetical within each group
  const sorted = entries
    .filter((e) => !IGNORE.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath) || entry.name;

    if (entry.isDirectory()) {
      const children = await readTree(fullPath, root, depth + 1);
      nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
    } else {
      nodes.push({ name: entry.name, path: relPath, type: 'file' });
    }
  }

  return nodes;
}

export const GET = withLogging('api.files', async (request) => {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  // 如果指定了 projectId，获取工程的路径
  let targetPath = process.env.MINT_CWD || process.cwd();
  let projectName = basename(targetPath);

  if (projectId) {
    try {
      const storage = getStorage();
      await storage.initialize();
      const projects = await storage.projects.list();
      const project = projects.find((p) => p.id === projectId);

      if (project && project.projectPath) {
        // 空路径或当前目录，使用默认值
        if (!project.projectPath || project.projectPath === '.') {
          targetPath = process.env.MINT_CWD || process.cwd();
          projectName = project.name;
        } else {
          // 直接解析为绝对路径
          let resolvedPath = resolve(project.projectPath);

          // 检查路径是否存在
          try {
            await access(resolvedPath);
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

          targetPath = resolvedPath;
          projectName = project.name;
        }
      }
    } catch {
      // ignore project path resolution errors
    }
  }

  // Check if targetPath is accessible
  const s = await stat(targetPath);
  if (!s.isDirectory()) {
    return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
  }

  const tree = await readTree(targetPath, targetPath, 0);

  // Also try to read a project name from package.json
  try {
    const pkg = await readFile(join(targetPath, 'package.json'), 'utf-8');
    const json = JSON.parse(pkg);
    if (json.name) projectName = json.name;
  } catch {
    // no package.json, use dirname
  }

  return NextResponse.json({ root: targetPath, projectName, tree });
});
