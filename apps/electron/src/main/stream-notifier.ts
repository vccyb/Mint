import { Notification, app, BrowserWindow } from 'electron';

let activeStreams = 0;
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow | null) {
  mainWindow = win;
}

export function onStreamStarted() {
  activeStreams++;
}

export function onStreamEnded() {
  activeStreams = Math.max(0, activeStreams - 1);
  if (activeStreams === 0 && mainWindow && !mainWindow.isFocused()) {
    showCompletionNotification();
  }
  // Clear dock badge when no streams active
  if (activeStreams === 0 && process.platform === 'darwin') {
    app.dock.setBadge('');
  }
}

function showCompletionNotification() {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: 'Mint',
    body: 'Response completed',
  });
  notification.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
  notification.show();

  // macOS dock badge
  if (process.platform === 'darwin') {
    app.dock.setBadge('•');
  }
}
