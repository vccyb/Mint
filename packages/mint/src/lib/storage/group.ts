import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';
import type { SessionGroup } from '@/types';

const log = createLogger('storage.group');

const DEFAULT_DATA: SessionGroup[] = [];

export class GroupStorage {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'agent-groups.json');
  }

  async read(): Promise<SessionGroup[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const groups = JSON.parse(raw) as SessionGroup[];
      log.debug('Groups read', { count: groups.length });
      return groups;
    } catch {
      log.debug('No groups file found, returning default');
      return DEFAULT_DATA;
    }
  }

  async write(groups: SessionGroup[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(groups, null, 2));
    log.debug('Groups written', { count: groups.length });
  }

  async addGroup(name: string): Promise<SessionGroup> {
    const groups = await this.read();
    const group: SessionGroup = {
      id: `grp_${Date.now().toString(36)}`,
      name,
      sessionIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    groups.push(group);
    await this.write(groups);
    log.debug('Group added', { groupId: group.id, name });
    return group;
  }

  async updateGroup(
    groupId: string,
    partial: Partial<Pick<SessionGroup, 'name' | 'sessionIds'>>,
  ): Promise<void> {
    const groups = await this.read();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    groups[idx] = { ...groups[idx], ...partial, updatedAt: Date.now() };
    await this.write(groups);
    log.debug('Group updated', { groupId, fields: Object.keys(partial) });
  }

  async deleteGroup(groupId: string): Promise<void> {
    const groups = await this.read();
    await this.write(groups.filter((g) => g.id !== groupId));
    log.debug('Group deleted', { groupId });
  }

  async moveSessionToGroup(sessionId: string, groupId: string | null): Promise<void> {
    const groups = await this.read();
    // Remove from all groups first
    for (const g of groups) {
      g.sessionIds = g.sessionIds.filter((id) => id !== sessionId);
    }
    // Add to target group if specified
    if (groupId) {
      const target = groups.find((g) => g.id === groupId);
      if (target) {
        target.sessionIds.push(sessionId);
        target.updatedAt = Date.now();
      }
    }
    await this.write(groups);
    log.debug('Session moved to group', { sessionId, groupId });
  }
}
