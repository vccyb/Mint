import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { McpServerConfig } from '../../types/mcp';

const CONFIG_PATH = () => path.join(os.homedir(), '.mint', 'mcp-servers.json');

async function ensureFile(): Promise<void> {
  const dir = path.dirname(CONFIG_PATH());
  await fs.mkdir(dir, { recursive: true });
  const exists = await fs.access(CONFIG_PATH()).then(
    () => true,
    () => false,
  );
  if (!exists) {
    await fs.writeFile(CONFIG_PATH(), '[]', 'utf-8');
  }
}

export async function loadMcpConfig(): Promise<McpServerConfig[]> {
  await ensureFile();
  const raw = await fs.readFile(CONFIG_PATH(), 'utf-8');
  return JSON.parse(raw) as McpServerConfig[];
}

export async function saveMcpConfig(configs: McpServerConfig[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(CONFIG_PATH(), JSON.stringify(configs, null, 2), 'utf-8');
}

export async function addMcpServer(config: Omit<McpServerConfig, 'id'>): Promise<McpServerConfig> {
  const configs = await loadMcpConfig();
  const newConfig: McpServerConfig = {
    ...config,
    id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  configs.push(newConfig);
  await saveMcpConfig(configs);
  return newConfig;
}

export async function removeMcpServer(id: string): Promise<void> {
  const configs = await loadMcpConfig();
  const filtered = configs.filter((c) => c.id !== id);
  await saveMcpConfig(filtered);
}

export async function toggleMcpServer(id: string): Promise<void> {
  const configs = await loadMcpConfig();
  const idx = configs.findIndex((c) => c.id === id);
  if (idx >= 0) {
    configs[idx].enabled = !configs[idx].enabled;
    await saveMcpConfig(configs);
  }
}
