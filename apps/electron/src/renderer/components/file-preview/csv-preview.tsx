
import { useMemo } from 'react';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\n' || ch === '\r') {
        row.push(current);
        current = '';
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
      } else {
        current += ch;
      }
    }
  }
  row.push(current);
  if (row.some((c) => c.trim())) rows.push(row);

  return rows;
}

interface CsvPreviewProps {
  content: string;
}

export function CsvPreview({ content }: CsvPreviewProps) {
  const rows = useMemo(() => parseCSV(content), [content]);

  if (rows.length === 0) {
    return <div className="p-4 text-sm text-text-tertiary">CSV 文件为空</div>;
  }

  const header = rows[0];
  const body = rows.slice(1);
  const maxCols = Math.max(...rows.map((r) => r.length));

  return (
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-bg-warm border-b border-border">
            {Array.from({ length: maxCols }).map((_, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-medium text-text-secondary border-r border-border/50 last:border-r-0"
              >
                {header[i] ?? ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-border/30 hover:bg-bg-warm/50">
              {Array.from({ length: maxCols }).map((_, ci) => (
                <td
                  key={ci}
                  className="px-3 py-1.5 text-text border-r border-border/30 last:border-r-0"
                >
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
