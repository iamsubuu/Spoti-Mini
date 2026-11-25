const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopIsland', {
  getState: () => ipcRenderer.invoke('island:get-state'),
  onState: (callback) => {
    const listener = (_evt, state) => callback(state);
    ipcRenderer.on('companion:state', listener);
    return () => ipcRenderer.removeListener('companion:state', listener);
  },
  resize: (width, height) => ipcRenderer.send('island:resize', { width, height }),
  moveBy: (dx, dy) => ipcRenderer.send('island:move-by', { dx, dy }),
  snapCenter: () => ipcRenderer.send('island:snap-center'),
  hide: () => ipcRenderer.send('island:hide'),
  quit: () => ipcRenderer.send('island:quit'),
  sendToExtension: (message) => ipcRenderer.send('island:send-to-extension', message),
});
