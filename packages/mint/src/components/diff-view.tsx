'use client';

interface DiffViewProps {
  content: string;
}

/**
 * Renders unified diff content with colored lines.
 */
export function DiffView({ content }: DiffViewProps) {
  const lines = content.split('\n');

  return (
    <div className="rounded-md border border-border bg-bg-warm overflow-hidden text-[11px] font-mono">
      <div className="max-h-64 overflow-auto">
        {lines.map((line, i) => {
          if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('index ')) {
            return (
              <div key={i} className="px-3 py-0.5 bg-bg text-text-tertiary font-semibold">
                {line}
              </div>
            );
          }
          if (line.startsWith('@@')) {
            return (
              <div key={i} className="px-3 py-0.5 bg-blue-50 text-blue-700">
                {line}
              </div>
            );
          }
          if (line.startsWith('+')) {
            return (
              <div key={i} className="px-3 py-0.5 bg-green-50 text-green-800">
                <span className="text-green-600 select-none">+</span>{line.slice(1)}
              </div>
            );
          }
          if (line.startsWith('-')) {
            return (
              <div key={i} className="px-3 py-0.5 bg-red-50 text-red-800">
                <span className="text-red-600 select-none">-</span>{line.slice(1)}
              </div>
            );
          }
          return (
            <div key={i} className="px-3 py-0.5 text-text-secondary">
              <span className="text-text-tertiary select-none"> </span>{line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Check if text looks like unified diff output */
export function isDiffContent(text: string): boolean {
  if (!text) return false;
  const lines = text.split('\n');
  let diffMarkers = 0;
  for (const line of lines.slice(0, 20)) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
      diffMarkers++;
    }
  }
  return diffMarkers >= 2;
}
