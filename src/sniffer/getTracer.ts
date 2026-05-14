import { traceStart } from "../types";
import { startTraceMacOs } from "./startTraceMacOs";
import { assert } from "node:console";

export async function getTracer(sendPacketUp: (hex: string) => void, sendEtherType: (etherType: number) => void, data: traceStart) {
    let proc;
    switch (process.platform) {
        case 'darwin':
            proc = await startTraceMacOs(data)
            break;
        case 'linux':
            // proc = await startTraceLinux(data)
            // break;
        default:
            throw new Error("Platform unsupported")
    }

    let partial = Buffer.alloc(128*1024) //128k should be enough to hold even the largest packet
    let partialLen = 0
    let etherType: number;
    proc.on('error', (err: any) => console.log("process emitted error", err))
    proc.on('close', (code: any, signal: any) => console.log("process closed", code, signal))
    proc.stdout.on('data', (packet: Buffer) => {
        if (etherType === undefined) {
            etherType = packet.readUInt32LE(0)
            sendEtherType(etherType)
            packet = packet.subarray(4)
        }
        if (partialLen && partialLen < 24) {
            assert(false)
        }
        if (partialLen) {
            assert(partialLen >= 24)
            const len = partial.readUInt32LE(16) //GET CAPLEN AND NOT LEN FROM PACKET!
            if (len > partialLen+packet.length-24) {
                assert(false)
            } else {
                packet.copy(partial, partialLen, 0, len+24-partialLen)
                sendPacketUp((partial.subarray(0, len+24) as any).toHex())
                packet = packet.subarray(len+24-partialLen)
                partialLen = 0
            }
        }
        while (packet.length >= 24) {
            const len = packet.readUInt32LE(16)
            if (len+24>packet.length) break
            
            sendPacketUp((packet.subarray(0, len+24) as any).toHex())
            packet = packet.subarray(len+24)
        }
        assert(partialLen === 0)
        if (packet.length) {
            packet.copy(partial, partialLen, 0, packet.length)
            partialLen = packet.length
        }
    })
    proc.stderr.on("data", (err: Buffer) => {
        console.log("STDERR!!!", err.toString('hex'));
        assert(false)
    })

    return proc
}