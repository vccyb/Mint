import { useState, useCallback } from 'react';

interface UseResizePanelsReturn {
  fileTreeWidth: number;
  previewWidth: number;
  terminalHeight: number;
  setFileTreeWidth: React.Dispatch<React.SetStateAction<number>>;
  setPreviewWidth: React.Dispatch<React.SetStateAction<number>>;
  setTerminalHeight: React.Dispatch<React.SetStateAction<number>>;
  handleResizeMouseDown: (e: React.MouseEvent) => void;
  handlePreviewResize: (e: React.MouseEvent) => void;
  handleTerminalResize: (e: React.MouseEvent) => void;
}

export function useResizePanels(): UseResizePanelsReturn {
  const [fileTreeWidth, setFileTreeWidth] = useState(220);
  const [previewWidth, setPreviewWidth] = useState(480);
  const [terminalHeight, setTerminalHeight] = useState(200);

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
        const delta = startX - ev.clientX;
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

  const handleTerminalResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = terminalHeight;
      const onMove = (ev: MouseEvent) => {
        const delta = startY - ev.clientY;
        setTerminalHeight(Math.min(500, Math.max(100, startHeight + delta)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [terminalHeight],
  );

  return {
    fileTreeWidth,
    previewWidth,
    terminalHeight,
    setFileTreeWidth,
    setPreviewWidth,
    setTerminalHeight,
    handleResizeMouseDown,
    handlePreviewResize,
    handleTerminalResize,
  };
}
