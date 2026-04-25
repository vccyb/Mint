import { promises as fs } from 'fs';
import path from 'path';
import type { Team, MailboxMessage } from '@/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('team-storage');

export class TeamStorage {
  constructor(private dataDir: string) {}

  private getFilePath(teamId: string): string {
    return path.join(this.dataDir, `${teamId}.jsonl`);
  }

  async saveTeam(team: Team): Promise<void> {
    const filePath = this.getFilePath(team.id);
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({ type: 'team', team }) + '\n');
    // Re-append all mailbox messages
    for (const msg of team.mailbox) {
      await fs.appendFile(filePath, JSON.stringify({ type: 'mailbox', message: msg }) + '\n');
    }
    log.info('Team saved', { teamId: team.id });
  }

  async loadTeam(teamId: string): Promise<Team | null> {
    const filePath = this.getFilePath(teamId);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let team: Team | null = null;
      const mailbox: MailboxMessage[] = [];

      for (const line of lines) {
        const record = JSON.parse(line);
        if (record.type === 'team' && record.team) {
          team = record.team;
        } else if (record.type === 'mailbox' && record.message) {
          mailbox.push(record.message);
        }
      }

      if (team) {
        team.mailbox = mailbox;
      }
      return team;
    } catch {
      return null;
    }
  }

  async loadTeamsBySession(sessionId: string): Promise<Team[]> {
    try {
      const files = await fs.readdir(this.dataDir);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

      const teams: Team[] = [];
      for (const file of jsonlFiles) {
        try {
          const teamId = file.replace('.jsonl', '');
          const team = await this.loadTeam(teamId);
          if (team && team.sessionId === sessionId) {
            teams.push(team);
          }
        } catch {
          // skip corrupted files
        }
      }

      return teams.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  async appendMailboxMessage(teamId: string, message: MailboxMessage): Promise<void> {
    const filePath = this.getFilePath(teamId);
    await fs.appendFile(filePath, JSON.stringify({ type: 'mailbox', message }) + '\n');
    log.info('Mailbox message appended', { teamId, messageId: message.id });
  }

  async deleteTeam(teamId: string): Promise<void> {
    const filePath = this.getFilePath(teamId);
    await fs.unlink(filePath).catch(() => {});
    log.info('Team deleted', { teamId });
  }
}

// Singleton instance for standalone function exports
import os from 'os';

function getTeamStorage(): TeamStorage {
  const dataDir = path.join(os.homedir(), '.mint', 'teams');
  return new TeamStorage(dataDir);
}

export async function saveTeam(team: Team): Promise<void> {
  const storage = getTeamStorage();
  return storage.saveTeam(team);
}

export async function loadTeam(teamId: string): Promise<Team | null> {
  const storage = getTeamStorage();
  return storage.loadTeam(teamId);
}

export async function loadTeamsBySession(sessionId: string): Promise<Team[]> {
  const storage = getTeamStorage();
  return storage.loadTeamsBySession(sessionId);
}

export async function appendMailboxMessage(teamId: string, message: MailboxMessage): Promise<void> {
  const storage = getTeamStorage();
  return storage.appendMailboxMessage(teamId, message);
}

export async function deleteTeam(teamId: string): Promise<void> {
  const storage = getTeamStorage();
  return storage.deleteTeam(teamId);
}
