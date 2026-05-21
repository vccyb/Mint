/**
 * Chat streaming service for Electron main process.
 * Extracted from packages/mint/src/app/api/chat/route.ts.
 * Replaces SSE response with IPC events via webContents.send().
 */
import { BrowserWindow } from 'electron';
import { getStorage } from './storage';
import { generateId } from './utils';
import { createLogger } from './logger';
import { classifyError } from './classify-error';
import { MAX_TOKENS, THINKING_BUDGET_TOKENS, DEFAULT_MODEL, DEFAULT_BASE_URL } from './constants';
import { buildApiMessages } from './message-builder';
import type { ChatMessage, StreamEventData, Attachment } from '../../types';

const log = createLogger('chat-service');

/** Active abort controllers per session for cancellation */
const activeControllers = new Map<string, AbortController>();

export interface ChatInput {
  message: string;
  sessionId?: string;
  attachments?: Attachment[];
  enableThinking?: boolean;
}

/**
 * Send a chat message and stream response via IPC events.
 * Events are sent to the renderer via webContents.send('chat:stream', event).
 */
export async function sendChat(webContents: Electron.WebContents, input: ChatInput): Promise<void> {
  const { message, sessionId, attachments, enableThinking } = input;
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

  // Build messages array for API
  const session = await storage.readSession(sid);
  const apiMessages = await buildApiMessages(session.messages);

  if (!apiKey) {
    log.warn('API key not configured');
    const errorEvent: StreamEventData = {
      type: 'error',
      data: 'ANTHROPIC_API_KEY not configured',
      sessionId: sid,
      errorCode: 'AUTH_ERROR',
    };
    webContents.send('chat:stream', errorEvent);
    return;
  }

  log.info('Provider configured', {
    model,
    hasApiKey: !!apiKey,
    baseUrl: baseUrl.replace(/\/\/[^/]+/, '//***'),
  });

  const buildRequestBody = (thinking: boolean) => ({
    model: model,
    max_tokens: MAX_TOKENS,
    messages: apiMessages,
    stream: true,
    ...(config?.systemPrompt ? { system: config.systemPrompt } : {}),
    ...(thinking ? { thinking: { type: 'enabled' as const, budget_tokens: THINKING_BUDGET_TOKENS } } : {}),
  });

  // Set up abort controller for this session
  const abortController = new AbortController();
  activeControllers.set(sid, abortController);

  const emit = (event: StreamEventData) => {
    webContents.send('chat:stream', event);
  };

  // Send session ID first
  emit({ type: 'content', data: '', sessionId: sid });

  try {
    let apiResponse = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(buildRequestBody(enableThinking ?? false)),
      signal: abortController.signal,
    });

    // Fallback: if thinking param is rejected, retry without it
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      log.warn('Provider API error', { status: apiResponse.status, snippet: errorText.slice(0, 200) });
      const isThinkingError = errorText.includes('thinking') || errorText.includes('unsupported');
      if (!isThinkingError) {
        const classified = classifyError(errorText, apiResponse.status);
        emit({ type: 'error', data: classified.userMessage, sessionId: sid, errorCode: classified.code });
        return;
      }
      // Retry without thinking
      apiResponse = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(buildRequestBody(false)),
        signal: abortController.signal,
      });
    }

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      log.error('Provider API error after retry', { status: apiResponse.status, snippet: errorText.slice(0, 200) });
      const classified = classifyError(errorText, apiResponse.status);
      emit({ type: 'error', data: classified.userMessage, sessionId: sid, errorCode: classified.code });
      return;
    }

    // Stream the response
    const body = apiResponse.body!;
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const assistantContent: string[] = [];
    const thinkingContent: string[] = [];
    let buffer = '';

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
        if (raw === '[DONE]' || !raw) continue;

        try {
          const event = JSON.parse(raw);
          if (eventName === 'error') {
            const errMsg = event?.error?.message ?? event?.message ?? 'Provider stream error';
            const classified = classifyError(errMsg);
            emit({ type: 'error', data: classified.userMessage, sessionId: sid, errorCode: classified.code });
            continue;
          }
          if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if (delta?.type === 'text_delta' && delta.text) {
              assistantContent.push(delta.text);
              emit({ type: 'content', data: delta.text, sessionId: sid });
            } else if (delta?.type === 'thinking_delta' && delta.thinking) {
              thinkingContent.push(delta.thinking);
              emit({ type: 'thinking', data: '', sessionId: sid, thinkingDelta: delta.thinking });
            }
          }
        } catch {
          // skip malformed JSON
        }
      }
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
        await storage.updateSessionMetadata(sid, { messageCount: 2 });
      } else {
        const updatedSession = await storage.readSession(sid);
        await storage.updateSessionMetadata(sid, { messageCount: updatedSession.messages.length });
      }
    }

    log.info('Chat stream completed', {
      contentLength: fullContent.length,
      hasThinking: !!fullThinking,
    });

    emit({
      type: 'result',
      data: JSON.stringify({ role: 'assistant', content: fullContent }),
      sessionId: sid,
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      log.info('Chat stream aborted', { sessionId: sid });
      return;
    }
    const errMsg = error instanceof Error ? error.message : 'Stream error';
    log.error('Stream read error', { error: errMsg });
    const classified = classifyError(errMsg);
    emit({ type: 'error', data: classified.userMessage, sessionId: sid, errorCode: classified.code });
  } finally {
    activeControllers.delete(sid);
  }
}

/**
 * Generate 3 follow-up suggestions based on the last assistant reply.
 * Uses a lightweight non-streaming LLM call.
 */
export async function generateSuggestions(content: string): Promise<string[]> {
  const storage = getStorage();
  await storage.initialize();
  const config = await storage.readConfig();
  const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
  const baseUrl = config?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? DEFAULT_BASE_URL;
  const model = config?.model ?? DEFAULT_MODEL;

  if (!apiKey || !content) return [];

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Based on the assistant reply below, generate 3 short follow-up questions a user might naturally ask next. Return ONLY a JSON array of 3 strings, nothing else. Each suggestion should be concise (under 15 characters). Respond in the same language as the reply.\n\nAssistant reply:\n${content.slice(0, 3000)}`,
          },
        ],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? '';

    // Try to extract JSON array from the response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map((s: unknown) => String(s));
    }
    return [];
  } catch (err) {
    log.warn('Failed to generate suggestions', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * Abort an active chat stream for a session.
 */
export function abortChat(sessionId: string): void {
  const controller = activeControllers.get(sessionId);
  if (controller) {
    controller.abort();
    activeControllers.delete(sessionId);
    log.info('Chat aborted', { sessionId });
  }
}
