import { getStorage } from '@/lib/storage';
import { encodeSSE, createSSEResponse } from '@/lib/sse';
import { generateId } from '@/lib/utils';
import { createRequestLogger } from '@/lib/logger';
import { classifyError } from '@/lib/classify-error';
import { MAX_ATTACHMENT_SIZE, MAX_TOKENS, THINKING_BUDGET_TOKENS, DEFAULT_MODEL, DEFAULT_BASE_URL } from '@/lib/constants';
import { truncateContent, parseDataUrl, extractPdfText } from '@/lib/attachment-utils';
import { withLogging } from '@/lib/with-logging';
import type { ChatMessage, StreamEventData, Attachment } from '@/types';

export const POST = withLogging('api.chat', async (request) => {
  const log = createRequestLogger('api.chat', generateId());

  const { message, sessionId, attachments, enableThinking } = (await request.json()) as {
    message: string;
    sessionId?: string;
    attachments?: Attachment[];
    enableThinking?: boolean;
  };

  const storage = getStorage();
  await storage.initialize();

  const config = await storage.readConfig();
  const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
  const baseUrl = config?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? DEFAULT_BASE_URL;
  const model = config?.model ?? DEFAULT_MODEL;

  const sid = sessionId ?? generateId();
  let isNewSession = false;

  log.info('Chat request received', {
    messageLength: message.length,
    sessionId: sessionId ?? 'new',
    attachmentCount: attachments?.length ?? 0,
  });

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
  const apiMessages: Array<{ role: string; content: unknown }> = [];
  for (const m of session.messages) {
    // Build multi-modal content blocks for messages with attachments
    if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
      const contentBlocks: Array<Record<string, unknown>> = [];

      for (const att of m.attachments) {
        if (att.size > MAX_ATTACHMENT_SIZE) continue;

        if (att.type.startsWith('image/') && att.content) {
          const parsed = parseDataUrl(att.content);
          if (parsed) {
            contentBlocks.push({
              type: 'image',
              source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64Data },
            });
          }
        } else if (att.type === 'application/pdf' && att.content) {
          // PDF: extract text server-side (following Proma's pattern)
          const pdfText = await extractPdfText(att.content);
          if (pdfText) {
            contentBlocks.push({
              type: 'text',
              text: `[File: ${att.name}]\n<file name="${att.name}">\n${truncateContent(pdfText)}\n</file>`,
            });
          } else {
            contentBlocks.push({
              type: 'text',
              text: `[File: ${att.name}] (PDF text extraction failed)`,
            });
          }
        } else if (att.content) {
          contentBlocks.push({
            type: 'text',
            text: `[File: ${att.name}]\n\`\`\`\n${truncateContent(att.content)}\n\`\`\``,
          });
        } else {
          contentBlocks.push({
            type: 'text',
            text: `[File: ${att.name}] (binary file, content not available)`,
          });
        }
      }

      contentBlocks.push({ type: 'text', text: m.content });
      apiMessages.push({ role: m.role, content: contentBlocks });
    } else {
      apiMessages.push({ role: m.role, content: m.content });
    }
  }

  if (!apiKey) {
    log.warn('API key not configured');
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream from Anthropic-compatible API
  log.info('Provider configured', {
    model,
    hasApiKey: !!apiKey,
    baseUrl: baseUrl.replace(/\/\/[^/]+/, '//***'),
  });

  const buildRequestBody = (enableThinking: boolean) => ({
    model: model,
    max_tokens: MAX_TOKENS,
    messages: apiMessages,
    stream: true,
    ...(enableThinking ? { thinking: { type: 'enabled' as const, budget_tokens: THINKING_BUDGET_TOKENS } } : {}),
  });

  let apiResponse = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(buildRequestBody(enableThinking ?? false)),
  });

  // Fallback: if thinking param is rejected, retry without it
  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    log.warn('Provider API error', { status: apiResponse.status, snippet: errorText.slice(0, 200) });
    const isThinkingError = errorText.includes('thinking') || errorText.includes('unsupported');
    if (!isThinkingError) {
      const classified = classifyError(errorText, apiResponse.status);
      const errorEvent: StreamEventData = { type: 'error', data: classified.userMessage, sessionId: sid, errorCode: classified.code };
      return createSSEResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(encodeSSE(errorEvent)));
            controller.close();
          },
        }),
      );
    }
    apiResponse = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(buildRequestBody(false)),
    });
  }

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    log.error('Provider API error after retry', { status: apiResponse.status, snippet: errorText.slice(0, 200) });
    const classified = classifyError(errorText, apiResponse.status);
    const errorEvent: StreamEventData = { type: 'error', data: classified.userMessage, sessionId: sid, errorCode: classified.code };
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
  const thinkingContent: string[] = [];

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
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            let eventName = 'message';
            const dataLines: string[] = [];

            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) {
                eventName = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataLines.push(line.slice(6).trim());
              }
            }

            const raw = dataLines.join('\n').trim();
            if (raw === '[DONE]') continue;
            if (!raw) continue;

            try {
              const event = JSON.parse(raw);
              if (eventName === 'error') {
                const message =
                  event?.error?.message ??
                  event?.message ??
                  'Provider stream error';
                const classified = classifyError(message);
                const errorEvent: StreamEventData = {
                  type: 'error',
                  data: classified.userMessage,
                  sessionId: sid,
                  errorCode: classified.code,
                };
                controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
                continue;
              }
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
                } else if (delta?.type === 'thinking_delta' && delta.thinking) {
                  thinkingContent.push(delta.thinking);
                  const thinkingEvent: StreamEventData = {
                    type: 'thinking',
                    data: '',
                    sessionId: sid,
                    thinkingDelta: delta.thinking,
                  };
                  controller.enqueue(encoder.encode(encodeSSE(thinkingEvent)));
                }
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Stream error';
        log.error('Stream read error', { error: errMsg });
        const classified = classifyError(errMsg);
        const errorEvent: StreamEventData = { type: 'error', data: classified.userMessage, sessionId: sid, errorCode: classified.code };
        controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
      }

      // Save assistant message
      const fullContent = assistantContent.join('');
      const fullThinking = thinkingContent.join('');
      if (fullContent || fullThinking) {
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
          thinkingContent: fullThinking || undefined,
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
      log.info('Chat stream completed', { contentLength: fullContent.length, hasThinking: !!fullThinking });
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
});
