import type { BrowserWindow } from 'electron';
import { createLogger } from './lib/logger';

const log = createLogger('updater');

type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string };

let statusListeners: ((status: UpdateStatus) => void)[] = [];
let autoUpdater: typeof import('electron-updater').autoUpdater | null = null;

export function onUpdateStatus(listener: (status: UpdateStatus) => void) {
  statusListeners.push(listener);
}

function emitStatus(status: UpdateStatus) {
  for (const listener of statusListeners) {
    listener(status);
  }
}

export async function setupAutoUpdater(mainWindow: BrowserWindow) {
  try {
    const { autoUpdater: updater } = await import('electron-updater');
    autoUpdater = updater;

    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = true;

    updater.on('checking-for-update', () => {
      log.info('Checking for update...');
      emitStatus({ type: 'checking' });
    });

    updater.on('update-available', (info) => {
      log.info('Update available', { version: info.version });
      emitStatus({ type: 'available', version: info.version });
    });

    updater.on('update-not-available', () => {
      log.info('Update not available');
      emitStatus({ type: 'not-available' });
    });

    updater.on('download-progress', (progress) => {
      emitStatus({ type: 'downloading', percent: Math.round(progress.percent) });
    });

    updater.on('update-downloaded', () => {
      log.info('Update downloaded');
      emitStatus({ type: 'downloaded' });
    });

    updater.on('error', (err) => {
      log.error('Update error', { error: err.message });
      emitStatus({ type: 'error', message: err.message });
    });

    // Check for updates on startup (with delay to let app settle)
    setTimeout(() => {
      updater.checkForUpdates().catch((err: Error) => {
        log.error('Initial update check failed', { error: err.message });
      });
    }, 10_000);

    // Check periodically every 4 hours
    setInterval(() => {
      updater.checkForUpdates().catch((err: Error) => {
        log.error('Periodic update check failed', { error: err.message });
      });
    }, 4 * 60 * 60 * 1000);
  } catch {
    log.info('electron-updater not available, skipping auto-update setup');
  }
}

export async function checkForUpdates(): Promise<{ checking: boolean }> {
  if (!autoUpdater) {
    return { checking: false };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { checking: true };
  } catch (err) {
    return { checking: false };
  }
}

export async function downloadAndInstallUpdate(): Promise<{ ok: boolean }> {
  if (!autoUpdater) {
    return { ok: false };
  }
  try {
    await autoUpdater.downloadUpdate();
    // Install on next quit
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
