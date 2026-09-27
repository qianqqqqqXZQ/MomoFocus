const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("momoFocusNative", {
  notify: (payload) => ipcRenderer.invoke("momofocus:notify", payload),
  openFloatingWindow: () =>
    ipcRenderer.invoke("momofocus:open-floating-window"),
  closeFloatingWindow: () =>
    ipcRenderer.invoke("momofocus:close-floating-window"),
  expandFloatingWindow: () =>
    ipcRenderer.invoke("momofocus:expand-floating-window"),
  collapseFloatingWindow: () =>
    ipcRenderer.invoke("momofocus:collapse-floating-window"),
  floatingCommand: (command) =>
    ipcRenderer.invoke("momofocus:floating-command", command),
  startFloatingDrag: (screenX, screenY) =>
    ipcRenderer.send("momofocus:start-floating-drag", { screenX, screenY }),
  moveFloatingDrag: (screenX, screenY) =>
    ipcRenderer.send("momofocus:move-floating-drag", { screenX, screenY }),
  endFloatingDrag: () => ipcRenderer.send("momofocus:end-floating-drag"),
  onFloatingCommand: (listener) => {
    const handler = (_event, command) => listener(command);
    ipcRenderer.on("momofocus:floating-command", handler);
    return () =>
      ipcRenderer.removeListener("momofocus:floating-command", handler);
  },
});
