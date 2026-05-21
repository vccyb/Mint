import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Plus, X } from 'lucide-react';

interface TerminalPanelProps {
  terminals: string[];
  activeTerminalId: string;
  onSelectTerminal: (id: string) => void;
  onAddTerminal: () => void;
  onCloseTerminal: (id: string) => void;
  onClosePanel: () => void;
  cwd?: string;
}

const LIGHT_THEME = {
  background: '#fcfaf5',
  foreground: '#1d1d1f',
  cursor: '#007aff',
  cursorAccent: '#fcfaf5',
  selectionBackground: 'rgba(0,122,255,0.15)',
  selectionForeground: '#1d1d1f',
  black: '#1d1d1f',
  red: '#d73a49',
  green: '#28a745',
  yellow: '#b08800',
  blue: '#0366d6',
  magenta: '#6f42c1',
  cyan: '#0598c8',
  white: '#6e6e73',
  brightBlack: '#424242',
  brightRed: '#cb2431',
  brightGreen: '#1a7f37',
  brightYellow: '#9a6700',
  brightBlue: '#005cc5',
  brightMagenta: '#5a32a3',
  brightCyan: '#0598c8',
  brightWhite: '#aeaeb2',
};

export function TerminalPanel({
  terminals,
  activeTerminalId,
  onSelectTerminal,
  onAddTerminal,
  onCloseTerminal,
  onClosePanel,
  cwd,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const unsubDataRef = useRef<(() => void) | null>(null);
  const unsubExitRef = useRef<(() => void) | null>(null);

  // Create/destroy xterm instance when activeTerminalId changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activeTerminalId) return;

    const api = (window as any).electronAPI;
    if (!api) return;

    const term = new Terminal({
      fontSize: 13,
      fontFamily: '"SF Mono", "Menlo", "Monaco", "Courier New", monospace',
      theme: LIGHT_THEME,
      cursorBlink: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // User input → PTY
    term.onData((data: string) => {
      api.terminalWrite(activeTerminalId, data);
    });

    // Auto-resize PTY when xterm resizes
    term.onResize(({ cols, rows }) => {
      api.terminalResize(activeTerminalId, cols, rows);
    });

    // PTY output → terminal
    const unsubData = api.onTerminalData((id: string, data: string) => {
      if (id === activeTerminalId && termRef.current) {
        termRef.current.write(data);
      }
    });
    unsubDataRef.current = unsubData;

    // PTY exit → show message
    const unsubExit = api.onTerminalExit((id: string, code: number) => {
      if (id === activeTerminalId && termRef.current) {
        termRef.current.write(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`);
      }
    });
    unsubExitRef.current = unsubExit;

    // Create PTY (awaited to avoid race)
    api.terminalCreate({ id: activeTerminalId, cwd }).then(() => {
      // Fit and focus after PTY is ready
      requestAnimationFrame(() => {
        fitAddon.fit();
        term.focus();
      });
    });

    // Cleanup: destroy this terminal instance
    return () => {
      unsubData();
      unsubExit();
      api.terminalKill(activeTerminalId);
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      unsubDataRef.current = null;
      unsubExitRef.current = null;
    };
  }, [activeTerminalId, cwd]);

  return (
    <div className="flex flex-col w-full h-full bg-[#fcfaf5]">
      {/* Tab bar */}
      <div className="flex items-center h-8 shrink-0 border-b border-border bg-[#fcfaf5] px-2">
        <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
          {terminals.map((id, idx) => (
            <button
              key={id}
              onClick={() => onSelectTerminal(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                id === activeTerminalId
                  ? 'bg-white text-text shadow-sm border border-border'
                  : 'text-text-tertiary hover:text-text hover:bg-bg-warm'
              }`}
            >
              <span>bash{terminals.length > 1 ? ` ${idx + 1}` : ''}</span>
              {terminals.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTerminal(id);
                  }}
                  className="ml-0.5 p-0.5 rounded hover:bg-bg-hover cursor-pointer"
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={onAddTerminal}
            className="flex items-center justify-center w-6 h-6 rounded text-text-tertiary hover:text-text hover:bg-bg-warm transition-colors cursor-pointer"
            title="新建终端"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={onClosePanel}
          className="flex items-center justify-center w-6 h-6 rounded text-text-tertiary hover:text-text hover:bg-bg-hover transition-colors cursor-pointer"
          title="关闭终端面板"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Terminal content */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 bg-[#fcfaf5]"
        style={{ padding: '2px 8px' }}
      />
    </div>
  );
}
