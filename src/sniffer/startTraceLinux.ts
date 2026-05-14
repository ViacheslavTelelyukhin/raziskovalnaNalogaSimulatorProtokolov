import { traceStart } from "../types";
import { ChildProcessWithoutNullStreams, exec, spawn } from "node:child_process";
import * as fs from "fs";

export async function startTraceLinux(data: traceStart): Promise<ChildProcessWithoutNullStreams> {
    const device = await new Promise<string>((resolve, reject) => exec('route get '+data.ip, (err, out, errMessage) => {
        if (!err) {
            const idx = out.indexOf("interface: ")
            resolve(out.substring(idx+11, out.indexOf(' ', idx+11)-1))
        }
        reject("Invalid ip or incompatible OS")
    }))
    console.log("DEVICE:'"+device+"'");
    let path = fs.existsSync('./src/sniffer/captureLinux') ? './src/sniffer/captureLinux' : '../Resources/captureLinux'
    return spawn('sudo', [path, device, data.filter || ''])
}