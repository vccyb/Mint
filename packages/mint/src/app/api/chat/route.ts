import { getStorage } from '@/lib/storage';
import { encodeSSE, createSSEResponse } from '@/lib/sse';
import { generateId } from '@/lib/utils';
import type { ChatMessage, StreamEventData, Attachment } from '@/types';

const MAX_ATTACHMENT_SIZE = 1024 * 1024; // 1MB

export async function POST(request: Request) {
  try {
    const { message, sessionId, attachments } = (await request.json()) as {
      message: string;
      sessionId?: string;
      attachments?: Attachment[];
    };

    const storage = getStorage();
    await storage.initialize();

    const config = await storage.readConfig();
    const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
    const baseUrl = config?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? 'https://open.bigmodel.cn/api/anthropic';
    const model = config?.model ?? 'glm-5.1';

    const sid = sessionId ?? generateId();
    let isNewSession = false;

    // Load or create session
    if (!sessionId) {
      isNewSession = true;
      await storage.createSession({
        id: sid,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        mode: 'chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        model: model,
      });
    }

    // Save user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };
    await storage.appendMessage(sid, userMsg);

    // Build messages array for API — reload session (now includes userMsg)
    const session = await storage.readSession(sid);
    let apiMessages = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Prepend attachment contents to the last user message
    if (attachments && attachments.length > 0) {
      const attachmentPrefix = attachments
        .filter((a) => a.content && a.size <= MAX_ATTACHMENT_SIZE)
        .map((a) => {
          if (a.type.startsWith('image/')) {
            return `[Image: ${a.name}]`;
          }
          return `[File: ${a.name}]\n\`\`\`\n${a.content}\n\`\`\``;
        })
        .join('\n\n');

      if (attachmentPrefix) {
        const lastIdx = apiMessages.length - 1;
        if (lastIdx >= 0 && apiMessages[lastIdx].role === 'user') {
          apiMessages[lastIdx] = {
            ...apiMessages[lastIdx],
            content: attachmentPrefix + '\n\n' + apiMessages[lastIdx].content,
          };
        }
      }
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream from Anthropic-compatible API
    const apiResponse = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      const errorEvent: StreamEventData = { type: 'error', data: errorText, sessionId: sid };
      return createSSEResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(encodeSSE(errorEvent)));
            controller.close();
          },
        }),
      );
    }

    const body = apiResponse.body!;
    const assistantContent: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Send session ID first
        const sessionEvent: StreamEventData = { type: 'content', data: '', sessionId: sid };
        controller.enqueue(encoder.encode(encodeSSE(sessionEvent)));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;

              try {
                const event = JSON.parse(raw);
                if (event.type === 'content_block_delta') {
                  const delta = event.delta;
                  if (delta?.type === 'text_delta' && delta.text) {
                    assistantContent.push(delta.text);
                    const contentEvent: StreamEventData = {
                      type: 'content',
                      data: delta.text,
                      sessionId: sid,
                    };
                    controller.enqueue(encoder.encode(encodeSSE(contentEvent)));
                  }
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Stream error';
          const errorEvent: StreamEventData = { type: 'error', data: errMsg, sessionId: sid };
          controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        }

        // Save assistant message
        const fullContent = assistantContent.join('');
        if (fullContent) {
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
          };
          await storage.appendMessage(sid, assistantMsg);

          if (isNewSession) {
            await storage.updateSessionMetadata(sid, {
              messageCount: 2,
            });
          } else {
            const session = await storage.readSession(sid);
            await storage.updateSessionMetadata(sid, {
              messageCount: session.messages.length,
            });
          }
        }

        // Send result
        const resultEvent: StreamEventData = {
          type: 'result',
          data: JSON.stringify({ role: 'assistant', content: fullContent }),
          sessionId: sid,
        };
        controller.enqueue(encoder.encode(encodeSSE(resultEvent)));
        controller.close();
      },
    });

    return createSSEResponse(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
