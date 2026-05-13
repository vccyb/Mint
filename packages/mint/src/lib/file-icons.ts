import {
  File,
  FileCode,
  FileCode2,
  FileText,
  FileJson,
  FileSpreadsheet,
  Image as ImageIcon,
  Lock,
  Settings,
} from 'lucide-react';

export type FileIconInfo = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;
  color: string;
};

export const FILE_ICON_MAP: Record<string, FileIconInfo> = {
  // TypeScript / JavaScript
  ts: { Icon: FileCode2, color: 'text-blue-500' },
  tsx: { Icon: FileCode2, color: 'text-blue-500' },
  js: { Icon: FileCode2, color: 'text-yellow-500' },
  jsx: { Icon: FileCode2, color: 'text-yellow-500' },
  mjs: { Icon: FileCode2, color: 'text-yellow-500' },
  // Python
  py: { Icon: FileCode2, color: 'text-green-500' },
  pyi: { Icon: FileCode2, color: 'text-green-500' },
  // Other languages
  rs: { Icon: FileCode2, color: 'text-orange-600' },
  go: { Icon: FileCode2, color: 'text-cyan-500' },
  rb: { Icon: FileCode2, color: 'text-red-500' },
  java: { Icon: FileCode2, color: 'text-red-500' },
  swift: { Icon: FileCode2, color: 'text-orange-500' },
  kt: { Icon: FileCode2, color: 'text-purple-500' },
  // Config / Data
  json: { Icon: FileJson, color: 'text-yellow-600' },
  yaml: { Icon: FileText, color: 'text-orange-500' },
  yml: { Icon: FileText, color: 'text-orange-500' },
  toml: { Icon: FileText, color: 'text-orange-500' },
  xml: { Icon: FileText, color: 'text-orange-400' },
  // Web
  css: { Icon: FileCode, color: 'text-purple-500' },
  scss: { Icon: FileCode, color: 'text-pink-500' },
  less: { Icon: FileCode, color: 'text-purple-400' },
  html: { Icon: FileCode, color: 'text-orange-600' },
  htm: { Icon: FileCode, color: 'text-orange-600' },
  vue: { Icon: FileCode2, color: 'text-green-400' },
  svelte: { Icon: FileCode2, color: 'text-orange-400' },
  // Docs
  md: { Icon: FileText, color: 'text-gray-500' },
  mdx: { Icon: FileText, color: 'text-gray-500' },
  txt: { Icon: FileText, color: 'text-gray-400' },
  csv: { Icon: FileSpreadsheet, color: 'text-green-600' },
  // Images
  png: { Icon: ImageIcon, color: 'text-teal-500' },
  jpg: { Icon: ImageIcon, color: 'text-teal-500' },
  jpeg: { Icon: ImageIcon, color: 'text-teal-500' },
  gif: { Icon: ImageIcon, color: 'text-teal-500' },
  svg: { Icon: ImageIcon, color: 'text-teal-500' },
  webp: { Icon: ImageIcon, color: 'text-teal-500' },
  ico: { Icon: ImageIcon, color: 'text-teal-500' },
  // Shell
  sh: { Icon: FileCode2, color: 'text-green-400' },
  bash: { Icon: FileCode2, color: 'text-green-400' },
  zsh: { Icon: FileCode2, color: 'text-green-400' },
  // Lockfile / Env
  lock: { Icon: Lock, color: 'text-gray-400' },
  env: { Icon: Settings, color: 'text-gray-500' },
  // SQL
  sql: { Icon: FileCode2, color: 'text-blue-400' },
};

const DEFAULT_ICON: FileIconInfo = { Icon: File, color: 'text-text-tertiary' };

export function getFileIcon(filename: string): FileIconInfo {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICON_MAP[ext] ?? DEFAULT_ICON;
}
