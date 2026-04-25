'use client';

import { useState, useCallback, useEffect } from 'react';
import { SessionSidebar } from './session-sidebar';
import { ChatView } from './chat-view';
import { AgentView } from './agent-view';
import { SettingsView } from './settings-view';
import { InlineEdit } from './inline-edit';
import { useChatStream } from '@/hooks/use-chat-stream';
import { StreamingRegistryProvider, useStreamingRegistry } from '@/lib/streaming-registry';
import type { Mode, SessionMetadata } from '@/types';

function MintAppInner() {
  const [mode, setMode] = useState<Mode>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const registry = useStreamingRegistry();
  const chatHook = useChatStream('chat', registry);
  const agentHook = useChatStream('agent', registry);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [sessionTitle, setSessionTitle] = useState('');

  const activeHook = mode === 'chat' ? chatHook : agentHook;

  // Track session titles from sidebar data
  const [sessionMap, setSessionMap] = useState<Map<string, SessionMetadata>>(new Map());

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
  }, []);

  const refreshSidebar = useCallback(() => {
    setSidebarKey((k) => k + 1);
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
        refreshSidebar();
      } catch {
        // ignore
      }
    },
    [refreshSidebar],
  );

  const handleTogglePin = useCallback(
    async (id: string, pinned: boolean) => {
      try {
        await fetch(`/api/sessions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned, pinnedAt: pinned ? Date.now() : undefined }),
        });
        refreshSidebar();
      } catch {
        // ignore
      }
    },
    [refreshSidebar],
  );

  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      if (!activeHook.sessionId) return;
      try {
        await fetch(`/api/sessions/${activeHook.sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle }),
        });
        setSessionTitle(newTitle);
        refreshSidebar();
      } catch {
        // ignore
      }
    },
    [activeHook.sessionId, refreshSidebar],
  );

  // Load session titles for sidebar
  useEffect(() => {
    fetch(`/api/sessions?mode=${mode}`)
      .then((res) => res.json())
      .then((data: SessionMetadata[]) => {
        const map = new Map<string, SessionMetadata>();
        for (const s of data) map.set(s.id, s);
        setSessionMap(map);
      })
      .catch(() => {});
  }, [mode, sidebarKey]);

  // Update title when active session changes
  useEffect(() => {
    if (activeHook.sessionId) {
      const meta = sessionMap.get(activeHook.sessionId);
      setSessionTitle(meta?.title ?? '');
    } else {
      setSessionTitle('');
    }
  }, [activeHook.sessionId, sessionMap]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <SessionSidebar
        key={`${mode}-${sidebarKey}`}
        mode={mode}
        onModeChange={handleModeChange}
        activeSessionId={activeHook.sessionId}
        onSelectSession={activeHook.loadSession}
        onNewChat={activeHook.clearSession}
        onDeleteSession={handleDeleteSession}
        onTogglePin={handleTogglePin}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.4))]">
        {/* Header */}
        <div className="glass-header flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-primary"
              aria-hidden="true"
            >
              <path
                d="m12 3-1.9 5.7a2 2 0 0 1-1.3 1.3L3 12l5.7 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.7a2 2 0 0 1 1.3-1.3L21 12l-5.7-1.9a2 2 0 0 1-1.3-1.3Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[13px] font-bold text-text">MINT</span>
            {activeHook.sessionId && sessionTitle && (
              <>
                <span className="mx-1 text-text-tertiary">/</span>
                <InlineEdit
                  value={sessionTitle}
                  onSave={handleTitleSave}
                  className="text-[13px] text-text-secondary"
                />
              </>
            )}
          </div>
        </div>

        {/* View */}
        {showSettings ? (
          <SettingsView onBack={() => setShowSettings(false)} />
        ) : mode === 'chat' ? (
          <ChatView
            messages={chatHook.messages}
            sessionKey={chatHook.sessionKey}
            isStreaming={chatHook.isStreaming}
            streamStartTime={chatHook.streamStartTime}
            onSend={chatHook.sendMessage}
            onStop={chatHook.stopStreaming}
          />
        ) : (
          <AgentView
            messages={agentHook.messages}
            sessionKey={agentHook.sessionKey}
            isStreaming={agentHook.isStreaming}
            streamStartTime={agentHook.streamStartTime}
            onSend={agentHook.sendMessage}
            onStop={agentHook.stopStreaming}
            pendingPermission={agentHook.pendingPermission}
            onPermissionDecision={agentHook.submitPermissionDecision}
            concurrencyLimitReached={!registry.canStartNew()}
            onApprovePlan={agentHook.approvePlan}
            permissionMode={agentHook.permissionMode}
            onPermissionModeChange={agentHook.setPermissionMode}
            onTogglePlanMode={agentHook.togglePlanMode}
          />
        )}
      </div>
    </div>
  );
}

export function MintApp() {
  return (
    <StreamingRegistryProvider>
      <MintAppInner />
    </StreamingRegistryProvider>
  );
}
