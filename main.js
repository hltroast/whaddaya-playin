const { app, BrowserWindow, ipcMain } = require('electron');                //Imports. Pulling "app", "BrowserWindow", and "ipcMain" tools out of Electron package
const path = require('node:path');                                          //Built-in Node tool for building filepaths

function createWindow() {                                                   //Creates a window of xWidth by yHeight
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }         //Loads the bridge before the page itself
  });
  win.loadFile('index.html');                                               //HTML page gets popped into window
}

ipcMain.handle('update-database', async () => {                             //DB update framework, to be filled-in
  console.log('Update requested');
  return 'Main process got the request';
});

app.whenReady().then(createWindow);                                         //Electron is a bit slow to start. When ready, calls "createWindow"
app.on('window-all-closed', () =>  app.quit());                              //quits app if all windows are closed