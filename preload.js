const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  notify: (text) => ipcRenderer.send("show-notification", text),
  openExternal: (url) => ipcRenderer.send("open-external", url)
});

