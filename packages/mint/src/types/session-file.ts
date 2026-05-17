/** A file persisted at the session level (not tied to a single message). */
export interface SessionFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
}

export interface SessionFileRecord {
  sessionId: string;
  files: SessionFile[];
}
