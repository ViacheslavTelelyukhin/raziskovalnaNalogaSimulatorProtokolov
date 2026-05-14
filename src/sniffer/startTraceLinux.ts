import { traceStart } from "../types";
import { ChildProcessWithoutNullStreams, exec, spawn } from "node:child_process";
import * as fs from "fs";

export async function startTraceLinux(data: traceStart): Promise<ChildProcessWithoutNullStreams> {
    const device = await new Promise<string>((resolve, reject) => exec('ip route get '+data.ip, (err, out, errMessage) => {
        if (!err) {
            const idx = out.indexOf(" dev ")
            if(idx == -1) reject('Invalid ip or incompatible OS')
            resolve(out.substring(idx+5, out.indexOf(' ', idx+5)))
        }
        reject("Invalid ip or incompatible OS")
    }))
    console.log("DEVICE:'"+device+"'");
    let dirPath = fs.existsSync('./src/sniffer') ? './src/sniffer' : '../Resources'
    return spawn("sudo -Av; sudo ", ["./captureLinuxX64", device, '"'+data.filter+'"'], {
        cwd: dirPath,
        env: {...process.env, 'SUDO_ASKPASS': './askPassLinux.sh'},
        shell: true
    })
}