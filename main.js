const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');                                          //Imports. Pulling "app", "BrowserWindow", and "ipcMain" tools out of Electron package
const path = require('node:path');                                                                    //Built-in Node tool for building filepaths
const { openDatabase, storeTags, storeGames, computeIdf } = require('./database');                                 //Database functions from database.js
const fs = require('node:fs');                                                                        //Built-in Node tool for file system access
const { pathToFileURL } = require('node:url');

const{ SteamImporter, rejection } = require('./steamImporter');                                       //Pulls in the SteamImporter class from a local file
const config = require('./config.json');                                                              //Loads the configuration file containing the Steam API key
const steam = new SteamImporter(config.steamApiKey);                                                  //Creates an instance of the SteamImporter class with the API key from the config file

const {searchGames, recommend} = require('./recommender');                                               //Pulls in the recommendation algorithm                      

let db;

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1500;
const HIDDEN_GAMES = [1888930];
const CAPSULE_CDN = 'https://shared.akamai.steamstatic.com/store_item_assets/';

protocol.registerSchemesAsPrivileged([ { scheme: 'capsule', privileges: {standard: true, secure: true } } ]);

function createWindow() {                                                                             //Creates a window of xWidth by yHeight
  const win = new BrowserWindow({                                                                                                                                                                                                                                                                                                                                                              
    width: 1440,
    height: 1280,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#333333',
    webPreferences: { preload: path.join(__dirname, 'preload.js')}
  });
  win.loadFile('index.html');                                                                         //HTML page gets popped into window
}

ipcMain.handle('update-database', async(event,mode) => {
  const progress = (text) => { if (!event.sender.isDestroyed()) event.sender.send('import-progress', text); };
  const progressFile = path.join(app.getPath('userData'), 'importProgress.json');

  try {
    progress('Fetching tag list...');
    const tagList = await steam.getTagList();
    storeTags(db, tagList.tags);

    let appIds;
    if (mode === 'test') {
      appIds = require('./testSet.json').appIds;
    } else {
      appIds = await steam.getAllAppIds(n => progress(`Listing games... ${n}`));
      if (mode === 'count') return `Steam lists ${appIds.length} games.`;
      appIds.sort((a,b) => a-b);
      if (fs.existsSync(progressFile)) {
        const { lastAppId } = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        appIds = appIds.filter(id => id > lastAppId);
        progress(`Resuming after app ${lastAppId}`);
      }
    }

    let stored = 0, skipped = 0, unknownTags = 0;
    const failed = [];

    const runBatch = async (batch) => {
      const result = await steam.getItems(batch);
      const keep = (result.store_items ?? []).filter(item => !rejection(item));
      skipped += (result.store_items ?? []).length - keep.length;
      unknownTags += storeGames(db, keep);
      stored += keep.length;
    };

    for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
      const batch = appIds.slice(i, i+ BATCH_SIZE);
      try {
        await runBatch(batch);
      } catch (error) {
        console.error(`Batch starting at ${batch[0]} failed: ${error.message}`);
        failed.push(batch);
      }
      if (mode === 'full') fs.writeFileSync(progressFile, JSON.stringify({ lastAppId: batch[batch.length-1] }));
      progress(`${Math.min(i + BATCH_SIZE, appIds.length)} / ${appIds.length} checked, ${stored} stored`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }

    let stillFailed = 0;
    for (const batch of failed) {
      try { await runBatch(batch); }
      catch (error) { stillFailed += batch.length; console.error (`Retry failed for batch at ${batch[0]}: ${error.message}`); }
    }

    progress('Computing IDF...');
    computeIdf(db);
    db.prepare(`UPDATE Games SET hidden = 1 WHERE game_id IN (SELECT value FROM json_each(?))`).run(JSON.stringify(HIDDEN_GAMES));
    if (mode === 'full') fs.rmSync(progressFile, { force: true});

    const { total } = db.prepare('SELECT COUNT (*) AS total FROM Games').get();
    if (unknownTags) console.warn(`${unknownTags} unknown tags skipped`);
    return `Done: ${stored} stored, ${skipped} skipped, ${stillFailed} failed. Database holds ${total} games.`;

  } catch (error) {
    console.error(error);
    return 'Import stopped: ' + error.message + (mode === 'full' ? ' (rerun to resume)' : '');
  }
});

ipcMain.handle('search-games', async (event, searchText) => {                                         //returns up to 8 games matching the typed text, sorted by total reviews. If no text is typed, returns an empty array
  if(!searchText.trim()) return [];
  return searchGames(db,searchText.trim());
});

ipcMain.handle('recommend', async (event, gameIds, count) => {                                               //Grabs game IDs, returns 5 recommendations
  if (gameIds.length === 0) return {error: 'Select at least one game you freakin\' weirdo'};
  const safeCount = Math.min(100, Math.max(1, Number.isInteger(count) ? count : 8));
  const results = recommend(db, gameIds, safeCount);
  //if(results.length) console.table(explainMatch(db, gameIds, results[0].game_id));                    //Prints top result score details in terminal
  return { results };
});


app.whenReady().then(() => {                                                                          //Electron is a bit slow to start. When ready, spins up a db and calls "createWindow"
  const dbPath = path.join(app.getPath('userData'), 'whaddayaPlayin.db');
  db = openDatabase(dbPath);
  const row = db.prepare('SELECT sqlite_version() AS version').get();
  console.log('SQLite version', row.version, 'at', dbPath);
  /* Image Logic */
  const capsuleDir = path.join(app.getPath('userData'), 'capsules');
  fs.mkdirSync(capsuleDir, { recursive: true });

  protocol.handle('capsule', async (request) => {
    const appId = Number(new URL(request.url).pathname.slice(1));
    const cacheFile = path.join(capsuleDir, `${appId}.jpg`);
    try {
      if (!Number.isInteger(appId)) throw new Error('bad app id');
      if(!fs.existsSync(cacheFile)) {
        const row = db.prepare('SELECT capsule_image FROM Games WHERE game_id = ?').get(appId);
        if (!row?.capsule_image) throw new Error('no capsule on record');
        const response = await fetch(CAPSULE_CDN + row.capsule_image);
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        fs.writeFileSync(cacheFile, Buffer.from(await response.arrayBuffer()));
      }
      return net.fetch(pathToFileURL(cacheFile).toString());
    } catch (error) {
      console.warn(`Capsule ${appId}: ${error.message}`);
      return new Response('', { status: 404 });
    }
  });
  createWindow();
});
app.on('window-all-closed', () =>  app.quit());                                                       //quits app if all windows are closed


//Add X after selected game to idicate a potential to delete