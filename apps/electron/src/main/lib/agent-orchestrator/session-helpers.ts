import { generateId } from '../utils';
import { MAX_ATTACHMENT_SIZE } from '../constants';
import { truncateContent, extractPdfText } from '../attachment-utils';
import { SessionStreamState } from '../agent-stream';
import type { ChatMessage, Attachment, SessionFile } from '../../../types';

export interface PromptParams {
  prompt: string;
  historyMessages: string;
  attachments?: Attachment[];
  sessionFiles?: SessionFile[];
  sessionFileContents?: Map<string, string>;
  /** Image file paths saved to disk (name -> absolute path) for agent Read tool */
  savedFilePaths?: Map<string, string>;
}

/** Build the full prompt with history, attachments, and session files. */
export async function buildPrompt(params: PromptParams): Promise<string> {
  let prompt = params.prompt;
  if (params.historyMessages) {
    prompt = `[Previous conversation]\n${params.historyMessages}\n[End of previous conversation]\n\nUser: ${params.prompt}`;
  }

  // Inject session files as persistent context
  if (params.sessionFiles && params.sessionFiles.length > 0) {
    const parts: string[] = [];
    parts.push('[Session Context Files]');
    parts.push('The following files have been uploaded to this session and are available as reference:');
    for (const sf of params.sessionFiles) {
      const content = params.sessionFileContents?.get(sf.id);
      if (content) {
        parts.push(`<file name="${sf.name}">\n${truncateContent(content)}\n</file>`);
      } else {
        parts.push(`[File: ${sf.name}] (content not available)`);
      }
    }
    parts.push('[End of Session Context Files]');
    prompt = parts.join('\n\n') + '\n\n' + prompt;
  }

  if (params.attachments && params.attachments.length > 0) {
    const parts: string[] = [];
    for (const a of params.attachments) {
      if (a.size > MAX_ATTACHMENT_SIZE) continue;

      if (a.type.startsWith('image/')) {
        const savedPath = params.savedFilePaths?.get(a.name);
        if (savedPath) {
          parts.push(`- ${a.name}: ${savedPath}`);
        } else {
          parts.push(`[Image: ${a.name}] (image not saved to disk)`);
        }
      } else if (a.type === 'application/pdf' && a.content) {
        const pdfText = await extractPdfText(a.content);
        if (pdfText) {
          parts.push(`<file name="${a.name}">\n${truncateContent(pdfText)}\n</file>`);
        } else {
          parts.push(`[File: ${a.name}] (PDF text extraction failed)`);
        }
      } else if (a.content) {
        parts.push(`[File: ${a.name}]\n\`\`\`\n${truncateContent(a.content)}\n\`\`\``);
      } else {
        parts.push(`[File: ${a.name}] (binary file, content not available in agent mode)`);
      }
    }
    if (parts.length > 0) {
      // Check if any parts are file path references (images saved to disk)
      const hasFilePathRefs = parts.some((p) => params.savedFilePaths?.size && p.includes(': /'));
      if (hasFilePathRefs) {
        // Separate image file refs from text file content
        const fileRefs: string[] = [];
        const textParts: string[] = [];
        for (const p of parts) {
          if (params.savedFilePaths?.size && p.includes(': /')) {
            fileRefs.push(p);
          } else {
            textParts.push(p);
          }
        }
        let prefix = '';
        if (fileRefs.length > 0) {
          prefix += '<attached_files>\n' + fileRefs.join('\n') + '\n</attached_files>\n\n';
        }
        if (textParts.length > 0) {
          prefix += textParts.join('\n\n') + '\n\n';
        }
        prompt = prefix + prompt;
      } else {
        prompt = parts.join('\n\n') + '\n\n' + prompt;
      }
    }
  }

  return prompt;
}

export interface SaveMessageParams {
  sessionId: string;
  isPlanMode: boolean;
  isNewSession: boolean;
  storage: {
    appendMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
    readSession: (sessionId: string) => Promise<{ messages: ChatMessage[] }>;
    updateSessionMetadata: (sessionId: string, meta: Record<string, unknown>) => Promise<void>;
  };
}

/** Save the assistant message to storage. */
export async function saveAssistantMessage(
  state: SessionStreamState,
  params: SaveMessageParams,
): Promise<void> {
  if (!state.assistantContent && state.toolCalls.length === 0 && !state.thinkingContent) return;

  const assistantMsg: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: state.assistantContent,
    timestamp: Date.now(),
    toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
    skillLoads: state.skillLoads.length > 0 ? state.skillLoads : undefined,
    todos:
      state.latestTodos.length > 0
        ? state.latestTodos.map((t) =>
            t.status === 'in_progress' ? { ...t, status: 'completed' as const } : t,
          )
        : undefined,
    thinkingContent: state.thinkingContent || undefined,
    isPlanMode: params.isPlanMode || undefined,
  };
  await params.storage.appendMessage(params.sessionId, assistantMsg);

  if (params.isNewSession) {
    await params.storage.updateSessionMetadata(params.sessionId, { messageCount: 2 });
  } else {
    const sess = await params.storage.readSession(params.sessionId);
    await params.storage.updateSessionMetadata(params.sessionId, {
      messageCount: sess.messages.length,
    });
  }
}
