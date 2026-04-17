import { IPC_METHODS, windowWithApi } from "../../types";

export function saveFile(path: string, content: string) {
    return (window as windowWithApi).api.invoke(IPC_METHODS.SAVE_FILE, path, content)
}

export function readFileUtil(path: string) {
    return (window as windowWithApi).api.invoke(IPC_METHODS.READ_FILE, path)
}