const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("momoFocusNative", {
  notify: (payload) => ipcRenderer.invoke("momofocus:notify", payload),
});
