import { traceStart } from "../types";
import { ChildProcessWithoutNullStreams, exec, spawn } from "node:child_process";
import * as fs from "fs";

export async function startTraceMacOs(data: traceStart): Promise<ChildProcessWithoutNullStreams> {
    const device = await new Promise<string>((resolve, reject) => exec('route get '+data.ip, (err, out, errMessage) => {
        if (!err) {
            const idx = out.indexOf("interface: ")
            if(idx == -1) reject('Invalid ip or incompatible OS')
            resolve(out.substring(idx+11, out.indexOf(' ', idx+11)-1))
        }
        reject("Invalid ip or incompatible OS")
    }))
    console.log("DEVICE:'"+device+"'");
    // return spawn('osascript', ["-e", 'do shell script \"./a.out '+device+' '+(data.filter || '')+'\" with administrator privileges'])
    let dirPath = fs.existsSync('./src/sniffer') ? './src/sniffer' : '../Resources'
    return spawn("sudo -Av; sudo ", ['./captureMacos', device, '"'+data.filter+'"'], {
        shell: true,
        env: {
            ...process.env,
            'SUDO_ASKPASS': './askPassMacos.sh'
        },
        cwd: dirPath
    })
}