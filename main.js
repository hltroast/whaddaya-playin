const { app, BrowserWindow, ipcMain } = require('electron');                //Imports. Pulling "app", "BrowserWindow", and "ipcMain" tools out of Electron package
const path = require('node:path');                                          //Built-in Node tool for building filepaths
const { openDatabase } = require('./database');                             //Built-in Node tool for SQLite database access

const{ SteamImporter } = require('./steamImporter');                        //Pulls in the SteamImporter class from a local file
const config = require('./config.json');                                    //Loads the configuration file containing the Steam API key
const steam = new SteamImporter(config.steamApiKey);                        //Creates an instance of the SteamImporter class with the API key from the config file

function createWindow() {                                                   //Creates a window of xWidth by yHeight
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }         //Loads the bridge before the page itself
  });
  win.loadFile('index.html');                                               //HTML page gets popped into window
}

/*
ipcMain.handle('update-database', async () => {                             //DB update framework, initial test
  console.log('Update requested');
  return 'Main process got the request';
});
*/

ipcMain.handle('update-database', async () => {                             //DB update test use, a single game
  try {
    const result = await steam.getItems([570940]);                          //Imports Dark Souls: Remastered
    console.log(JSON.stringify(result, null, 2));
    return 'Fetched Dark Souls: Remastered, check terminal';
  } catch (error) {
    console.error(error);
    return 'Steam request failed: ' + error.message;
  }
})

app.whenReady().then(() => {                                                //Electron is a bit slow to start. When ready, spins up a db and calls "createWindow"
  const dbPath = path.join(app.getPath('userData'), 'whaddayaPlayin.db');
  const db = openDatabase(dbPath);
  const row = db.prepare('SELECT sqlite_version() AS version').get();
  console.log('SQLite version', row.version, 'at', dbPath);
  createWindow();
});
app.on('window-all-closed', () =>  app.quit());                              //quits app if all windows are closed