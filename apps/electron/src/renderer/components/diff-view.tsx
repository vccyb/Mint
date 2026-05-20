
interface DiffViewProps {
  content: string;
}

/**
 * Renders unified diff content with colored lines,
 * line numbers, and left-border highlights.
 */
export function DiffView({ content }: DiffViewProps) {
  const lines = content.split('\n');

  return (
    <div className="font-mono text-[11px] leading-relaxed bg-bg-warm">
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
            <div
              key={i}
              className="flex bg-green-50 text-green-800 border-l-[3px] border-l-green-500"
            >
              <span className="w-8 shrink-0 text-right pr-2 text-text-tertiary select-none">
                {i + 1}
              </span>
              <span className="text-green-600 select-none">+</span>
              <span className="flex-1">{line.slice(1)}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          return (
            <div key={i} className="flex bg-red-50 text-red-800 border-l-[3px] border-l-red-500">
              <span className="w-8 shrink-0 text-right pr-2 text-text-tertiary select-none">
                {i + 1}
              </span>
              <span className="text-red-600 select-none">-</span>
              <span className="flex-1 line-through">{line.slice(1)}</span>
            </div>
          );
        }

        // Context line
        return (
          <div key={i} className="flex text-text-secondary">
            <span className="w-8 shrink-0 text-right pr-2 text-text-tertiary select-none">
              {i + 1}
            </span>
            <span className="text-text-tertiary select-none"> </span>
            <span className="flex-1">{line}</span>
          </div>
        );
      })}
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
