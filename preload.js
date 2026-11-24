const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    updateDatabase: (mode) => ipcRenderer.invoke('update-database', mode),
    onImportProgress: (callback) => ipcRenderer.on('import-progress', (_event, text) => callback(text)),
    searchGames: (searchText) => ipcRenderer.invoke('search-games', searchText),
    recommend: (gameIds, count) => ipcRenderer.invoke('recommend', gameIds, count)
});