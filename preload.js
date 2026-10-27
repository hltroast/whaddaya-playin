const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    updateDatabase: () => ipcRenderer.invoke('update-database')
});