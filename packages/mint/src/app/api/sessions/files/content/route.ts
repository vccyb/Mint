import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';

/** GET — read session file content */
export const GET = withLogging('api.sessions.files.content', async (request) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const fileId = searchParams.get('fileId');
  if (!sessionId || !fileId) {
    return new Response(
      JSON.stringify({ error: 'sessionId and fileId are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const storage = getStorage();
  await storage.initialize();

  const files = await storage.sessionFiles.listFiles(sessionId);
  const file = files.find((f) => f.id === fileId);
  if (!file) {
    return new Response(JSON.stringify({ error: 'File not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const content = await storage.sessionFiles.getFileContent(sessionId, fileId);
  if (content === null) {
    return new Response(JSON.stringify({ error: 'File content not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isImage = file.type.startsWith('image/');
  if (isImage && typeof content === 'string') {
    return new Response(
      JSON.stringify({
        content: String(content),
        encoding: 'base64',
        name: file.name,
        type: file.type,
        size: file.size,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      content: String(content),
      name: file.name,
      type: file.type,
      size: file.size,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
