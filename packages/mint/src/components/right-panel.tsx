'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { X, Maximize2, Minimize2, Users, FolderOpen } from 'lucide-react';

export type PanelState = 'hidden' | 'visible' | 'fullscreen';
export type PanelTab = 'files' | 'team';

interface RightPanelContextValue {
  panelState: PanelState;
  setPanelState: (state: PanelState) => void;
  activeTab: PanelTab;
  setActiveTab: (tab: PanelTab) => void;
}

export const RightPanelContext = createContext<RightPanelContextValue>({
  panelState: 'hidden',
  setPanelState: () => {},
  activeTab: 'files',
  setActiveTab: () => {},
});

export const useRightPanel = () => useContext(RightPanelContext);

interface RightPanelProps {
  children: ReactNode;
  /** Number of active (running) agents — shown as badge on Team tab */
  activeAgentCount?: number;
}

export function RightPanel({
  children,
  activeAgentCount = 0,
}: RightPanelProps) {
  const { panelState, setPanelState, activeTab, setActiveTab } =
    useRightPanel();

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
      {/* Tab bar */}
      <div className="flex items-center gap-0 px-2 pt-1.5 pb-0 border-b border-border shrink-0">
        {/* Team tab */}
        <button
          onClick={() => setActiveTab('team')}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-t-[5px] transition-colors cursor-pointer ${
            activeTab === 'team'
              ? 'bg-bg text-[#1D1D1F]'
              : 'text-[#AEAEB2] hover:text-[#6E6E73]'
          }`}
        >
          <Users className="h-3 w-3" />
          <span>Team</span>
          {activeAgentCount > 0 && (
            <span className={`flex items-center justify-center min-w-[14px] h-[14px] rounded-full text-[8px] font-bold leading-none px-[3px] ${
              activeTab === 'team'
                ? 'bg-[#007AFF] text-white'
                : 'bg-[#007AFF]/15 text-[#007AFF]'
            }`}>
              {activeAgentCount}
            </span>
          )}
        </button>

        {/* Files tab */}
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-t-[5px] transition-colors cursor-pointer ${
            activeTab === 'files'
              ? 'bg-bg text-[#1D1D1F]'
              : 'text-[#AEAEB2] hover:text-[#6E6E73]'
          }`}
        >
          <FolderOpen className="h-3 w-3" />
          <span>文件</span>
        </button>

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
