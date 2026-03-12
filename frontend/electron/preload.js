/**
 * APHELION Desktop - Preload Script
 * Exposes safe IPC bridges to the renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Window controls
  window: {
    minimize:    () => ipcRenderer.invoke('window:minimize'),
    maximize:    () => ipcRenderer.invoke('window:maximize'),
    close:       () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // App info
  app: {
    version:  () => ipcRenderer.invoke('app:version'),
    platform: () => ipcRenderer.invoke('app:platform'),
  },

  // Schwab API status
  schwab: {
    status: () => ipcRenderer.invoke('schwab:status'),
  },
});
