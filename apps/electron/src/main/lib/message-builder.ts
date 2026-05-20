import { MAX_ATTACHMENT_SIZE } from './constants';
import { truncateContent, parseDataUrl, extractPdfText } from './attachment-utils';
import type { ChatMessage } from '../../types';

/**
 * Content block types used in the Anthropic Messages API.
 */
type ImageSource = {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
};

type TextBlock = {
  type: 'text';
  text: string;
};

type ContentBlock = ImageSource | TextBlock;

export interface ApiMessage {
  role: string;
  content: string | ContentBlock[];
}

/**
 * Convert session messages (with optional attachments) into the multi-modal
 * content-block format expected by the Anthropic Messages API.
 */
export async function buildApiMessages(messages: ChatMessage[]): Promise<ApiMessage[]> {
  const apiMessages: ApiMessage[] = [];

  for (const m of messages) {
    if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
      const contentBlocks: ContentBlock[] = [];

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

  return apiMessages;
}
