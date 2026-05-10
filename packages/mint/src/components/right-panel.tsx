'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { X, Maximize2, Minimize2, FolderOpen } from 'lucide-react';

export type PanelState = 'hidden' | 'visible' | 'fullscreen';

interface RightPanelContextValue {
  panelState: PanelState;
  setPanelState: (state: PanelState) => void;
}

export const RightPanelContext = createContext<RightPanelContextValue>({
  panelState: 'hidden',
  setPanelState: () => {},
});

export const useRightPanel = () => useContext(RightPanelContext);

interface RightPanelProps {
  children: ReactNode;
}

export function RightPanel({
  children,
}: RightPanelProps) {
  const { panelState, setPanelState } = useRightPanel();

  const toggleFullscreen = useCallback(() => {
    setPanelState(panelState === 'fullscreen' ? 'visible' : 'fullscreen');
  }, [panelState, setPanelState]);

  const close = useCallback(() => {
    setPanelState('hidden');
  }, [setPanelState]);

  if (panelState === 'hidden') {
    return null;
  }

  const isFullscreen = panelState === 'fullscreen';

  return (
    <div
      className={`flex flex-col min-h-0 bg-bg border-l border-border ${
        isFullscreen ? 'flex-1' : 'w-[280px] shrink-0'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center gap-0 px-2 pt-1.5 pb-0 border-b border-border shrink-0">
        {/* Title */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5">
          <FolderOpen className="h-3 w-3 text-gray-500" />
          <span className="text-[11px] font-medium text-gray-600">文件</span>
        </div>

        <div className="flex-1" />

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center justify-center w-[20px] h-[20px] rounded-[5px] text-[#AEAEB2] hover:text-[#6E6E73] hover:bg-bg-warm transition-colors cursor-pointer shrink-0"
          title={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </button>

        {/* Close button */}
        <button
          onClick={close}
          className="flex items-center justify-center w-[20px] h-[20px] rounded-[5px] text-[#AEAEB2] hover:text-[#6E6E73] hover:bg-bg-warm transition-colors cursor-pointer shrink-0"
          title="关闭面板"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
