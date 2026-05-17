import { MAX_ATTACHMENT_SIZE } from '@/lib/constants';
import { truncateContent, parseDataUrl, extractPdfText } from '@/lib/attachment-utils';
import type { ChatMessage } from '@/types';

/**
 * Content block types used in the Anthropic Messages API.
 * Each block is either an image source or a text segment.
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

/**
 * A single message in the format expected by the Anthropic Messages API.
 * Content can be a plain string or an array of multi-modal content blocks.
 */
export interface ApiMessage {
  role: string;
  content: string | ContentBlock[];
}

/**
 * Convert session messages (with optional attachments) into the multi-modal
 * content-block format expected by the Anthropic Messages API.
 *
 * - Image attachments become `image` source blocks (base64).
 * - PDF attachments are server-side text-extracted and sent as `text` blocks.
 * - Other text attachments are embedded inline as fenced code blocks.
 * - The user's text message is always appended as the last text block.
 * - Attachments exceeding MAX_ATTACHMENT_SIZE are silently skipped.
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
