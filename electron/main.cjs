const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("node:path");

let mainWindow = null;
let floatingWindow = null;

app.setAppUserModelId("com.momofocus.app");

ipcMain.handle("momofocus:notify", (_event, payload) => {
  if (
    !Notification.isSupported() ||
    !payload ||
    typeof payload.title !== "string"
  )
    return false;
  new Notification({
    title: payload.title,
    body: typeof payload.body === "string" ? payload.body : "",
  }).show();
  return true;
});

function closeFloatingWindow() {
  if (floatingWindow && !floatingWindow.isDestroyed()) floatingWindow.close();
  floatingWindow = null;
}

ipcMain.handle("momofocus:open-floating-window", () => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.show();
    floatingWindow.focus();
    return true;
  }

  const iconPath = path.join(app.getAppPath(), "assets", "tomato.ico");
  floatingWindow = new BrowserWindow({
    width: 300,
    height: 174,
    minWidth: 260,
    minHeight: 150,
    maxWidth: 420,
    maxHeight: 240,
    title: "番茄小窝 · 专注浮窗",
    icon: iconPath,
    alwaysOnTop: true,
    resizable: true,
    frame: false,
    transparent: false,
    autoHideMenuBar: true,
    parent: mainWindow ?? undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  floatingWindow.on("closed", () => {
    floatingWindow = null;
  });

  if (isDevelopment) {
    floatingWindow.loadURL(`${developmentUrl}/?floating=1`);
  } else {
    floatingWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      query: { floating: "1" },
    });
  }
  return true;
});

ipcMain.handle("momofocus:close-floating-window", () => {
  closeFloatingWindow();
  return true;
});

const isDevelopment = !app.isPackaged;
const developmentUrl =
  process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";

function createWindow() {
  const iconPath = path.join(app.getAppPath(), "assets", "tomato.ico");

  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: "番茄小窝",
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  mainWindow = window;

  if (isDevelopment) {
    window.loadURL(developmentUrl);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
    closeFloatingWindow();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
