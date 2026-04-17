import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS, IPC_METHODS } from './types';
import * as fs from "fs";

//declare constants for typescript
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

//declare variables and constants
let mainWindow: BrowserWindow = null
const WORKING_DIRECTORY = './projects/'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Not sure what this is
if (require('electron-squirrel-startup')) {
  app.quit();
}

//handle app open / close
const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: true,
      contextIsolation: true,
    },
  });
  
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0)
    createWindow();
});

//handle ipc
ipcMain.handle(IPC_METHODS.LIST_PROJECTS, (event) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(WORKING_DIRECTORY)) fs.mkdirSync(WORKING_DIRECTORY)
    fs.readdir(WORKING_DIRECTORY, (err, files) => {
      if(err) reject(err)
      resolve(files)
    })
  })
})

ipcMain.handle(IPC_METHODS.SAVE_FILE, (event, path, content) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(WORKING_DIRECTORY+path, content, 'utf8', (err) => {
      if (err) reject(err)
      resolve('success')
    })
  })
})

ipcMain.handle(IPC_METHODS.READ_FILE, (event, path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(WORKING_DIRECTORY+path, 'utf8', (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
})


console.log("Main script done");
