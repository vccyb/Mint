import { MAX_EMBEDDED_TEXT_SIZE } from './constants';

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.svg',
  '.md',
  '.txt',
  '.csv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.sh',
  '.bash',
  '.zsh',
  '.sql',
  '.graphql',
  '.toml',
  '.ini',
  '.env',
  '.gitignore',
  '.log',
  '.conf',
  '.cfg',
  '.dockerfile',
]);

const PDF_EXTENSIONS = new Set(['.pdf']);

/**
 * Determine if a file is text-safe based on MIME type and/or extension.
 */
export function isTextFile(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith('text/')) return true;
  if (
    [
      'application/json',
      'application/xml',
      'application/javascript',
      'application/typescript',
      'application/x-yaml',
    ].includes(mimeType)
  )
    return true;
  const ext = '.' + (fileName.split('.').pop()?.toLowerCase() ?? '');
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Determine if a file is a PDF based on MIME type and/or extension.
 */
export function isPdfFile(mimeType: string, fileName: string): boolean {
  if (mimeType === 'application/pdf') return true;
  const ext = '.' + (fileName.split('.').pop()?.toLowerCase() ?? '');
  return PDF_EXTENSIONS.has(ext);
}

/**
 * Truncate text content with a clear marker when it exceeds maxSize.
 */
export function truncateContent(content: string, maxSize: number = MAX_EMBEDDED_TEXT_SIZE): string {
  if (content.length <= maxSize) return content;
  const truncated = content.slice(0, maxSize);
  return `${truncated}\n\n... [File truncated at ${Math.round(maxSize / 1024)}KB. Original size: ${Math.round(content.length / 1024)}KB]`;
}

/**
 * Extract base64 data and media type from a data URL string.
 * Returns null if the string is not a valid data URL.
 */
export function parseDataUrl(dataUrl: string): { mediaType: string; base64Data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { mediaType: match[1], base64Data: match[2] };
}

/**
 * Extract text from a PDF attachment's base64 content.
 * Uses pdf-parse library (lazy-loaded). Follows Proma's pattern.
 * Returns null if extraction fails or content is not a data URL.
 */
export async function extractPdfText(_content: string): Promise<string | null> {
  // PDF extraction is handled in the main process (chat-service / agent-service)
  // The renderer should not directly parse PDFs.
  return null;
}
