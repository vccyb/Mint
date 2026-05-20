import { promises as fs } from 'fs';
import path from 'path';
import type { SessionFile, SessionFileRecord } from '../../types';

const META_FILE = 'meta.json';

export class SessionFileStorage {
  constructor(private baseDir: string) {}

  async initialize(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async listFiles(sessionId: string): Promise<SessionFile[]> {
    const metaPath = this.getMetaPath(sessionId);
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      const record: SessionFileRecord = JSON.parse(raw);
      return record.files;
    } catch {
      return [];
    }
  }

  async addFile(
    sessionId: string,
    file: SessionFile,
    content: string | Buffer,
  ): Promise<void> {
    const dir = this.getFileDir(sessionId);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.name) || '.bin';
    const contentFileName = `${file.id}${ext}`;
    await fs.writeFile(path.join(dir, contentFileName), content);

    const files = await this.listFiles(sessionId);
    files.push(file);
    await this.writeMeta(sessionId, { sessionId, files });
  }

  async getFileContent(sessionId: string, fileId: string): Promise<string | Buffer | null> {
    const dir = this.getFileDir(sessionId);
    try {
      const entries = await fs.readdir(dir);
      const match = entries.find((e) => e.startsWith(fileId + '.'));
      if (!match) return null;
      const filePath = path.join(dir, match);
      const buf = await fs.readFile(filePath);
      const ext = path.extname(match);
      if (ext === '.b64') return buf.toString('utf-8');
      return buf.toString('utf-8');
    } catch {
      return null;
    }
  }

  async deleteFile(sessionId: string, fileId: string): Promise<void> {
    const dir = this.getFileDir(sessionId);
    try {
      const entries = await fs.readdir(dir);
      const match = entries.find((e) => e.startsWith(fileId + '.'));
      if (match) {
        await fs.unlink(path.join(dir, match));
      }
    } catch {
      /* file may not exist */
    }

    const files = await this.listFiles(sessionId);
    const filtered = files.filter((f) => f.id !== fileId);
    await this.writeMeta(sessionId, { sessionId, files: filtered });
  }

  async deleteAllFiles(sessionId: string): Promise<void> {
    const dir = this.getFileDir(sessionId);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    const metaPath = this.getMetaPath(sessionId);
    try {
      await fs.unlink(metaPath);
    } catch {
      /* ignore */
    }
  }

  private getMetaPath(sessionId: string): string {
    return path.join(this.baseDir, `${sessionId}-files.json`);
  }

  private getFileDir(sessionId: string): string {
    return path.join(this.baseDir, sessionId);
  }

  private async writeMeta(sessionId: string, record: SessionFileRecord): Promise<void> {
    const metaPath = this.getMetaPath(sessionId);
    await fs.writeFile(metaPath, JSON.stringify(record, null, 2), 'utf-8');
  }
}
