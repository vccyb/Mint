import { useState, useCallback } from 'react';

interface UseResizePanelsReturn {
  fileTreeWidth: number;
  previewWidth: number;
  setFileTreeWidth: React.Dispatch<React.SetStateAction<number>>;
  setPreviewWidth: React.Dispatch<React.SetStateAction<number>>;
  handleResizeMouseDown: (e: React.MouseEvent) => void;
  handlePreviewResize: (e: React.MouseEvent) => void;
}

export function useResizePanels(): UseResizePanelsReturn {
  const [fileTreeWidth, setFileTreeWidth] = useState(220);
  const [previewWidth, setPreviewWidth] = useState(480);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = fileTreeWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setFileTreeWidth(Math.min(400, Math.max(150, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [fileTreeWidth],
  );

  const handlePreviewResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = previewWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX; // 向左拖 = 预览变宽
        setPreviewWidth(Math.min(800, Math.max(200, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [previewWidth],
  );

  return {
    fileTreeWidth,
    previewWidth,
    setFileTreeWidth,
    setPreviewWidth,
    handleResizeMouseDown,
    handlePreviewResize,
  };
}
