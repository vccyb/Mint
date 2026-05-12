'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp', css: 'css', scss: 'scss',
  less: 'less', html: 'markup', htm: 'markup', json: 'json',
  xml: 'markup', yaml: 'yaml', yml: 'yaml', md: 'markdown',
  sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
  toml: 'toml', ini: 'ini', conf: 'text', env: 'bash',
  dockerfile: 'docker', makefile: 'makefile',
  swift: 'swift', kt: 'kotlin', scala: 'scala', php: 'php',
  vue: 'html', svelte: 'html',
};

function getLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile') return 'docker';
  if (lower === 'makefile') return 'makefile';
  if (lower.startsWith('.env')) return 'bash';
  if (lower === '.gitignore' || lower === '.prettierrc' || lower === '.eslintrc') return 'bash';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'text';
}

interface CodePreviewProps {
  content: string;
  filename: string;
}

export function CodePreview({ content, filename }: CodePreviewProps) {
  const language = getLanguage(filename);

  return (
    <SyntaxHighlighter
      language={language}
      style={oneLight}
      showLineNumbers
      lineNumberStyle={{ minWidth: '3em', paddingRight: '1em', color: '#bbb', userSelect: 'none' }}
      customStyle={{
        margin: 0,
        padding: '12px',
        fontSize: '12px',
        lineHeight: '1.6',
        background: 'transparent',
      }}
      wrapLines
    >
      {content}
    </SyntaxHighlighter>
  );
}
