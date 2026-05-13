import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_MODEL, DEFAULT_BASE_URL } from '@/lib/constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('storage.config');

export interface AppConfig {
  model: string;
  systemPrompt?: string;
  apiKey?: string;
  baseUrl?: string;
  skillsEnabled?: boolean;
  permissionMode?: 'bypassPermissions' | 'default' | 'plan';
}

const DEFAULT_CONFIG: AppConfig = {
  model: DEFAULT_MODEL,
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  baseUrl: DEFAULT_BASE_URL,
};

export class ConfigStorage {
  constructor(private configPath: string) {}

  async read(): Promise<AppConfig | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      log.debug('Config read');
      return JSON.parse(content);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  async write(config: AppConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    log.debug('Config written');
  }

  async update(partial: Partial<AppConfig>): Promise<AppConfig> {
    const current = (await this.read()) ?? DEFAULT_CONFIG;
    const updated = { ...current, ...partial };
    await this.write(updated);
    log.debug('Config updated', { fields: Object.keys(partial) });
    return updated;
  }
}
