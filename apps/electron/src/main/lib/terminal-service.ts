import * as pty from 'node-pty';
import * as os from 'os';
import { BrowserWindow } from 'electron';
import { TERMINAL_IPC } from '../../types/ipc-channels';
import { createLogger } from './logger';

const log = createLogger('terminal');

const terminals = new Map<string, pty.IPty>();

function getShell(): string {
  return os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/zsh';
}

export function createTerminal(id: string, cwd?: string): void {
  if (terminals.has(id)) {
    killTerminal(id);
  }

  const shell = getShell();
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd || os.homedir(),
    env: process.env as Record<string, string>,
  });

  terminals.set(id, ptyProcess);

  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  ptyProcess.onData((data: string) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send(TERMINAL_IPC.DATA, id, data);
    }
  });

  ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
    terminals.delete(id);
    if (win && !win.isDestroyed()) {
      win.webContents.send(TERMINAL_IPC.EXIT, id, exitCode);
    }
  });

  log.info('Terminal created', { id });
}

export function killTerminal(id: string): void {
  const proc = terminals.get(id);
  if (proc) {
    proc.kill();
    terminals.delete(id);
    log.info('Terminal killed', { id });
  }
}

export function writeToTerminal(id: string, data: string): void {
  const proc = terminals.get(id);
  if (proc) {
    proc.write(data);
  }
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const proc = terminals.get(id);
  if (proc) {
    proc.resize(cols, rows);
  }
}

export function killAllTerminals(): void {
  for (const [id, proc] of terminals) {
    proc.kill();
    log.info('Terminal killed (cleanup)', { id });
  }
  terminals.clear();
}
