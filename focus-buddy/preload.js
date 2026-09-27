// Focus Buddy - PRELOAD (secure bridge).
// Runs with contextIsolation ON. It exposes a tiny, safe API to the renderer
// so the UI code can ask the main process to move the real desktop window.
// The renderer never touches Node or Electron directly.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('focusBuddy', {
  getWorkArea: () => ipcRenderer.invoke('fb:get-workarea'),
  getBounds: () => ipcRenderer.invoke('fb:get-bounds'),
  setPosition: (x, y) => ipcRenderer.send('fb:set-position', { x, y }),
  moveBy: (dx, dy) => ipcRenderer.send('fb:move-by', { dx, dy }),
  setPanel: (open) => ipcRenderer.send('fb:set-compact', { open }),
  quit: () => ipcRenderer.send('fb:quit')
});
