const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    updateDatabase: () => ipcRenderer.invoke('update-database'),
    searchGames: (searchText) => ipcRenderer.invoke('search-games', searchText),
    recommend: (gameIds) => ipcRenderer.invoke('recommend', gameIds)
});