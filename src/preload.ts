// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        //may transform sent values here. We don't really need this so just send forward.
        send: (channel: string, ...data: any) => ipcRenderer.send(channel, ...data),
        on: (channel: string, func: (...args: any) => void) => {
            const handle = (event: IpcRendererEvent, ...args: any[]) => func(...args)
            ipcRenderer.on(channel, handle)
            return () => ipcRenderer.off(channel, handle)
        },
        once: (channel: string, func: (...args: any) => void) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
        invoke: (channel: string, ...data: any[]) => ipcRenderer.invoke(channel, ...data)
    }
);
console.log("Preload script has executed");