import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { registerIpcHandlers } from './ipc';
import { buildApplicationMenu } from './menu';
import { setupAutoUpdater } from './updater';
import { setMainWindow } from './stream-notifier';
import { killAllTerminals } from './lib/terminal-service';
import { createLogger } from './lib/logger';

const log = createLogger('main');

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
  });

  // Share window reference with stream notifier
  setMainWindow(mainWindow);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // macOS: 关闭窗口隐藏而非退出
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault();
      mainWindow?.hide();
      app.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    setMainWindow(null);
    killAllTerminals();
  });

  // Build application menu
  buildApplicationMenu(mainWindow);

  // Setup auto-updater (production only)
  if (!isDev) {
    setupAutoUpdater(mainWindow);
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
