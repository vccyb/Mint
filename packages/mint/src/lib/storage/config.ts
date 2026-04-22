import { promises as fs } from 'fs';
import path from 'path';

export interface AppConfig {
  model: string;
  systemPrompt?: string;
  apiKey?: string;
  baseUrl?: string;
  skillsEnabled?: boolean;
  permissionMode?: 'bypassPermissions' | 'default' | 'plan';
}

const DEFAULT_CONFIG: AppConfig = {
  model: 'glm-5.1',
  apiKey: '086ecec9a9f54beb9cd699e9efa485a6.aQOSnbbfxK4JpzZf',
  baseUrl: 'https://open.bigmodel.cn/api/anthropic',
};

export class ConfigStorage {
  constructor(private configPath: string) {}

  async read(): Promise<AppConfig | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  async write(config: AppConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  async update(partial: Partial<AppConfig>): Promise<AppConfig> {
    const current = (await this.read()) ?? DEFAULT_CONFIG;
    const updated = { ...current, ...partial };
    await this.write(updated);
    return updated;
  }
}
