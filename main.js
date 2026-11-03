const { app, BrowserWindow, ipcMain } = require('electron');                                          //Imports. Pulling "app", "BrowserWindow", and "ipcMain" tools out of Electron package
const path = require('node:path');                                                                    //Built-in Node tool for building filepaths
const { openDatabase, storeTags, storeGame } = require('./database');                                 //Database functions from database.js
const fs = require('node:fs');                                                                        //Built-in Node tool for file system access

const{ SteamImporter, rejection } = require('./steamImporter');                                       //Pulls in the SteamImporter class from a local file
const config = require('./config.json');                                                              //Loads the configuration file containing the Steam API key
const steam = new SteamImporter(config.steamApiKey);                                                  //Creates an instance of the SteamImporter class with the API key from the config file

const {findGame, recommend} = require('./recommender');                                               //Pulls in the recommendation algorithm                      

let db;

function createWindow() {                                                                             //Creates a window of xWidth by yHeight
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }                                   //Loads the bridge before the page itself
  });
  win.loadFile('index.html');                                                                         //HTML page gets popped into window
}

/*
ipcMain.handle('update-database', async () => {                                                       //DB update framework, initial test
  console.log('Update requested');
  return 'Main process got the request';
});
*/

/*                                                                                                   //DB update test case showcase, uncomment for live demo
ipcMain.handle('update-database', async () => {                                                       //DB update test use
  try {
    const tagList = await steam.getTagList();
    storeTags(db, tagList.tags);                                                                      //Stores the tags in the database
    const result = await steam.getItems([570940, 3152790, 3153540, 5101960]);                         //Grabs info for four use cases
    for (const item of result.store_items) {
      const reason = rejection(item);
      if(reason) {
        console.log(`Skipped ${item.id} (${item.name}): ${reason}`);
        continue;
      }
      storeGame(db,item);
      console.log(`Stored ${item.id} (${item.name})`);
    } return 'Import test finished, check terminal';
  } catch (error) {
    console.error(error);
    return 'Steam request failed: ' + error.message;
  }
})
  */

ipcMain.handle('update-database', async () => {                                                       //DB update test use
  try {
    const tagList = await steam.getTagList();
    storeTags(db, tagList.tags);                                                                      
    const {appIds} = require('./testSet.json');
    let stored = 0, skipped = 0;
    
    for (let i = 0; i < appIds.length; i+=100){
      const batch = appIds.slice(i, i+100);
      const result = await steam.getItems(batch);
      for (const item of result.store_items) {
        const reason = rejection(item);
        if (reason) {
          console.log(`Skipped ${item.id} (${item.name}): ${reason}`);
          skipped++;
          continue;
        }
        storeGame(db,item);
        stored++;
      }
    } return `Done: ${stored} games stored, ${skipped} skipped.`;

  } catch (error) {
    console.error(error);
    return 'Steam request failed: ' + error.message;
  }
})

ipcMain.handle('recommend', async (event, searchText) => {                                            //Finds game by name, returns closest matches
  const game = findGame(db, searchText);
  if (!game) {
    return { error: `no game found matching "${searchText}"` };
  }
  return {input: game, results: recommend(db, game.game_id, 5) };                                     //Returns 3 games
});


app.whenReady().then(() => {                                                                          //Electron is a bit slow to start. When ready, spins up a db and calls "createWindow"
  const dbPath = path.join(app.getPath('userData'), 'whaddayaPlayin.db');
  db = openDatabase(dbPath);
  const row = db.prepare('SELECT sqlite_version() AS version').get();
  console.log('SQLite version', row.version, 'at', dbPath);
  createWindow();
});
app.on('window-all-closed', () =>  app.quit());                                                       //quits app if all windows are closed