import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Add any needed IPC methods here
  isElectron: true,
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveNotes: (folderPath: string, notes: any) => ipcRenderer.invoke('save-notes', folderPath, notes),
  loadNotes: (folderPath: string) => ipcRenderer.invoke('load-notes', folderPath)
});
