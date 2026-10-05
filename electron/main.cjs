const { app, BrowserWindow, ipcMain, Menu, Notification } = require("electron");
const path = require("node:path");

let mainWindow = null;
let floatingWindow = null;
let floatingDrag = null;
let floatingResizeTimer = null;

const FLOATING_COLLAPSED_WIDTH = 78;
const FLOATING_EXPANDED_WIDTH = 378;

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
  if (floatingResizeTimer) {
    clearTimeout(floatingResizeTimer);
    floatingResizeTimer = null;
  }
  if (floatingWindow && !floatingWindow.isDestroyed()) floatingWindow.close();
  floatingWindow = null;
  floatingDrag = null;
}

function isFloatingSender(event) {
  return Boolean(
    floatingWindow &&
    !floatingWindow.isDestroyed() &&
    event.sender === floatingWindow.webContents,
  );
}

function resizeFloatingWindow(expanded) {
  if (!floatingWindow || floatingWindow.isDestroyed()) return false;
  const { x, y } = floatingWindow.getBounds();
  const targetWidth = expanded
    ? FLOATING_EXPANDED_WIDTH
    : FLOATING_COLLAPSED_WIDTH;
  const [startWidth] = floatingWindow.getContentSize();
  if (floatingResizeTimer) clearTimeout(floatingResizeTimer);

  const startedAt = Date.now();
  const duration = 220;
  const tick = () => {
    if (!floatingWindow || floatingWindow.isDestroyed()) {
      floatingResizeTimer = null;
      return;
    }
    const progress = Math.min(1, (Date.now() - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const width = Math.round(startWidth + (targetWidth - startWidth) * eased);
    floatingWindow.setContentSize(width, 78, false);
    floatingWindow.setPosition(x, y, false);
    if (progress < 1) {
      floatingResizeTimer = setTimeout(tick, 16);
    } else {
      floatingResizeTimer = null;
    }
  };
  tick();
  return true;
}

function keepFloatingWindowVisible() {
  if (!floatingWindow || floatingWindow.isDestroyed()) return;
  floatingWindow.setAlwaysOnTop(true, "floating");
  floatingWindow.showInactive();
}

ipcMain.handle("momofocus:open-floating-window", () => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    resizeFloatingWindow(false);
    floatingWindow.setAlwaysOnTop(true, "floating");
    floatingWindow.show();
    floatingWindow.focus();
    return true;
  }

  const iconPath = path.join(app.getAppPath(), "assets", "tomato.ico");
  floatingWindow = new BrowserWindow({
    width: 78,
    height: 78,
    minWidth: 78,
    minHeight: 78,
    maxWidth: FLOATING_EXPANDED_WIDTH,
    maxHeight: 78,
    title: "番茄小窝 · 专注浮窗",
    icon: iconPath,
    parent: null,
    modal: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    useContentSize: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  floatingWindow.setAlwaysOnTop(true, "floating");

  floatingWindow.on("closed", () => {
    floatingWindow = null;
  });
  floatingWindow.webContents.on("context-menu", (event) => {
    event.preventDefault();
    if (!floatingWindow || floatingWindow.isDestroyed()) return;
    Menu.buildFromTemplate([
      {
        label: "关闭浮窗",
        click: () => closeFloatingWindow(),
      },
    ]).popup({ window: floatingWindow });
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

ipcMain.handle("momofocus:expand-floating-window", () =>
  resizeFloatingWindow(true),
);

ipcMain.handle("momofocus:collapse-floating-window", () =>
  resizeFloatingWindow(false),
);

ipcMain.handle("momofocus:floating-command", (event, command) => {
  if (
    (command !== "toggleTimer" && command !== "abandonTask") ||
    !isFloatingSender(event) ||
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {
    return false;
  }
  mainWindow.webContents.send("momofocus:floating-command", command);
  return true;
});

ipcMain.on("momofocus:start-floating-drag", (event, point) => {
  if (
    !isFloatingSender(event) ||
    !point ||
    typeof point.screenX !== "number" ||
    typeof point.screenY !== "number"
  )
    return;
  const { x, y } = floatingWindow.getBounds();
  floatingDrag = {
    offsetX: point.screenX - x,
    offsetY: point.screenY - y,
  };
});

ipcMain.on("momofocus:move-floating-drag", (event, point) => {
  if (
    !isFloatingSender(event) ||
    !floatingDrag ||
    !point ||
    typeof point.screenX !== "number" ||
    typeof point.screenY !== "number"
  )
    return;
  floatingWindow.setPosition(
    Math.round(point.screenX - floatingDrag.offsetX),
    Math.round(point.screenY - floatingDrag.offsetY),
    false,
  );
});

ipcMain.on("momofocus:end-floating-drag", (event) => {
  if (isFloatingSender(event)) floatingDrag = null;
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
  window.on("minimize", () => {
    keepFloatingWindowVisible();
  });
  window.on("hide", () => {
    keepFloatingWindowVisible();
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
