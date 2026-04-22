import { resolvePending } from '@/lib/permission-store';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      requestId: string;
      behavior: 'allow' | 'deny';
      message?: string;
      updatedInput?: Record<string, unknown>;
    };

    const { requestId, behavior, message, updatedInput } = body;

    if (!requestId || !behavior) {
      return new Response(
        JSON.stringify({ error: 'requestId and behavior are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const result =
      behavior === 'allow'
        ? { behavior: 'allow' as const, updatedInput }
        : { behavior: 'deny' as const, message: message || 'User denied' };

    const resolved = resolvePending(requestId, result);

    return new Response(
      JSON.stringify({ ok: resolved }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
