const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("momoFocusNative", {
  notify: (payload) => ipcRenderer.invoke("momofocus:notify", payload),
  openFloatingWindow: () =>
    ipcRenderer.invoke("momofocus:open-floating-window"),
  closeFloatingWindow: () =>
    ipcRenderer.invoke("momofocus:close-floating-window"),
});
