import { app, BrowserWindow, ipcMain } from 'electron';
import { automaton, device, deviceInterface, IPC_CHANNELS, IPC_METHODS, network, protocolLayer, traceStart } from './types';
import * as fs from "fs";
import { getTracer } from './sniffer/getTracer';
import path from 'path';

//declare constants for typescript
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
//this method may be nice for them on desktop but each window consumes around 100MB of RAM. Since there will rarely be 5+ automatons on a machine we eat the loss.
declare const STATE_FOLLOWER_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const STATE_FOLLOWER_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

//declare variables and constants
let mainWindow: BrowserWindow = null!

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

  // mainWindow.webContents.openDevTools();
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

function getAppDataPath() {
  switch (process.platform) {
    case "darwin": {
      return path.join((process as any).env["HOME"], "Library", "Application Support", "ViacheslavTelelyukhinProtcolTool");
    }
    case "linux": {
      return path.join((process as any).env["HOME"], ".ViacheslavTelelyukhinProtcolTool");
    }
    default: {
      console.log("Unsupported platform!");
      process.exit(1);
    }
  }
}

//handle ipc
ipcMain.handle(IPC_METHODS.LIST_PROJECTS, (event) => {
  return new Promise((resolve, reject) => {
    const appDataDirPath = getAppDataPath();
    if (!fs.existsSync(appDataDirPath)) fs.mkdirSync(appDataDirPath)
    fs.readdir(appDataDirPath, (err, files) => {
      if(err) return reject(err)
      resolve(files)
    })
  })
})

ipcMain.handle(IPC_METHODS.SAVE_FILE, (event, name, content) => {
  return new Promise((resolve, reject) => {
    const appDataDirPath = getAppDataPath();
    if (!fs.existsSync(appDataDirPath)) {
      fs.mkdirSync(appDataDirPath);
    }
    const appDataFilePath = path.join(appDataDirPath, name);
    fs.writeFile(appDataFilePath, content, 'utf8', (err) => {
      if (err) return reject(err)
      resolve('success')
    })
  })
})

ipcMain.handle(IPC_METHODS.READ_FILE, (event, name) => {
  return new Promise((resolve, reject) => {
    const appDataDirPath = getAppDataPath();
    if (!fs.existsSync(appDataDirPath)) {
      fs.mkdirSync(appDataDirPath);
    }
    const appDataFilePath = path.join(appDataDirPath, name);
    fs.readFile(appDataFilePath, 'utf8', (err, data) => {
      if (err) return reject(err)
      resolve(data)
    })
  })
})

let tracing: (traceStart&{window: BrowserWindow, etherType: Promise<number>})[] = []
let tracingLayers: protocolLayer[] = [];
let tracingIfList: deviceInterface[] = [];
ipcMain.handle(IPC_METHODS.START_TRACE, (event, data: traceStart[], layers: protocolLayer[], interfacesList: deviceInterface[]) => {
  //data is port, filter string, automaton (with inputs configured)
  return new Promise(async (resolve, reject) => {
    if (tracing.find(t => t)) return reject("Must complete previous trace first")
    else tracing = []
    tracingLayers = layers
    tracingIfList = interfacesList
    for (let i = 0; i < data.length; i++) {
      const w = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
          preload: STATE_FOLLOWER_WINDOW_PRELOAD_WEBPACK_ENTRY,
          webSecurity: true,
          contextIsolation: true,
        },
      });
      let setEther: Function = null as any;
      tracing.push({...data[i], window: w,
        //to je vsaj top 3 najbolj spranih odlomkov kode, ki sem ih kdarkoli napisal. Zadevas ne deluje kot race condition ampak je še vedno res grda
        etherType: new Promise<number>((resolve, reject) => {
          setEther = resolve
        })
      })
      
      w.loadURL(STATE_FOLLOWER_WINDOW_WEBPACK_ENTRY);
      // w.webContents.openDevTools();
      const tracer = await getTracer(
        packet => w.webContents.send('packets', packet),
        (setEther as any),
        error => {
          console.error("Failed to start packet capture process encountered error: "+error);
          w.close();
          tracing[i] = null as any;
          try{tracer?.kill()}catch(e){}
        },
        data[i]
      ).catch(err => {
        console.error("Failed to start packet capture "+err);
        w.close();
        tracing[i] = null as any;
      });
      w.on('close', () => {
        tracing[i] = null as any;
        //the process wil know to terminate
        //after our c code ends, the sudos and shells and the rest should clean themselves up
        //this is putting quite a bit of trust into the c proc though
        tracer?.stdin?.write("KILL", err => {
          if(err) console.error("Error while telling packet capture process tp shut down "+err)
        })
      })
    }
    resolve('done')
  })
})
ipcMain.handle(IPC_METHODS.GET_TRACING, (event) => {
  return new Promise(async (resolve, reject) => {
    const windowIndex = tracing.findIndex(t => t.window.webContents === event.sender)
    if (windowIndex === -1) return reject("Can't find the window")
    //console.log(tracing, windowIndex);
    resolve({tracing: {...tracing[windowIndex], window: undefined, etherType: await tracing[windowIndex].etherType}, layers: tracingLayers, devices: tracingIfList})
  })
})

console.log("Main script done");
