
import { useState } from 'react';

interface ImagePreviewProps {
  content: string; // base64 encoded
  mimeType: string;
}

export function ImagePreview({ content, mimeType }: ImagePreviewProps) {
  const [scale, setScale] = useState(1);
  const src = `data:${mimeType};base64,${content}`;

  return (
    <div className="flex flex-col h-full">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-bg-warm/50">
        <button
          onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
          className="px-2 py-0.5 text-[11px] rounded border border-border hover:bg-bg-hover"
        >
          -
        </button>
        <span className="text-[11px] text-text-secondary min-w-[3em] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(4, s + 0.25))}
          className="px-2 py-0.5 text-[11px] rounded border border-border hover:bg-bg-hover"
        >
          +
        </button>
        <button
          onClick={() => setScale(1)}
          className="px-2 py-0.5 text-[11px] rounded border border-border hover:bg-bg-hover ml-1"
        >
          重置
        </button>
      </div>
      {/* Image */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]">
        <img
          src={src}
          alt="Preview"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="max-w-full max-h-full object-contain transition-transform"
          draggable={false}
        />
      </div>
    </div>
  );
}
