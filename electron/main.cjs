const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const isDevelopment = !app.isPackaged;
const developmentUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: '番茄小窝',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDevelopment) {
    window.loadURL(developmentUrl);
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
