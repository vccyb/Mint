import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';
import { generateId } from '@/lib/id';
import { isTextFile } from '@/lib/attachment-utils';
import { MAX_ATTACHMENT_SIZE } from '@/lib/constants';
import type { SessionFile } from '@/types';

/** GET — list session files */
export const GET = withLogging('api.sessions.files.list', async (request) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const storage = getStorage();
  await storage.initialize();
  const files = await storage.sessionFiles.listFiles(sessionId);
  return new Response(JSON.stringify({ files }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

/** POST — upload files to a session */
export const POST = withLogging('api.sessions.files.upload', async (request) => {
  const formData = await request.formData();
  const sessionId = formData.get('sessionId') as string | null;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const storage = getStorage();
  await storage.initialize();

  const uploaded: SessionFile[] = [];
  const entries = formData.getAll('files');
  for (const entry of entries) {
    if (!(entry instanceof File)) continue;

    if (entry.size > MAX_ATTACHMENT_SIZE) continue;

    const mime = entry.type || 'application/octet-stream';
    const isText = isTextFile(mime, entry.name);

    let content: string | Buffer;
    if (isText) {
      content = await entry.text();
    } else {
      const buf = Buffer.from(await entry.arrayBuffer());
      content = buf.toString('base64');
    }

    const file: SessionFile = {
      id: `sf_${generateId()}`,
      name: entry.name,
      type: mime,
      size: entry.size,
      uploadedAt: Date.now(),
    };

    await storage.sessionFiles.addFile(sessionId, file, content);
    uploaded.push(file);
  }

  return new Response(JSON.stringify({ files: uploaded }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
});

/** DELETE — remove a file from a session */
export const DELETE = withLogging('api.sessions.files.delete', async (request) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const fileId = searchParams.get('fileId');
  if (!sessionId || !fileId) {
    return new Response(JSON.stringify({ error: 'sessionId and fileId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const storage = getStorage();
  await storage.initialize();
  await storage.sessionFiles.deleteFile(sessionId, fileId);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
