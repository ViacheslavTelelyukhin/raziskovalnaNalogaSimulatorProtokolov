import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld(
    "api", {
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
console.log("Preload script has executed!!!");