//------SKRIPTA NAMENJENA ZGOLJ ZA TESTIRANJE-------


// import { createSession, decode } from "pcap";
// import proj from "./L2L3Decapsulator.json" with { type: "json" };

// const decapsulatePacket = (packet, frame) => {
//     let content, offset = 0;
//     const entries = [], szTot = packet.length*8
//     frame.fields.forEach((f, fi) => {
//         let sz
//         if (isNaN(parseInt(f.size))) {
//             let func;
//             eval('func = '+f.size)
//             if (typeof func !== 'function') throw new Error('invalid function')
//             sz = func(Object.fromEntries(entries))
//             if (typeof sz !== 'number') throw new Error('bad function ', f.size)
//         } else sz = parseInt(f.size)
//         //tmp
//         if (sz === -1) sz = szTot-offset

//         //todo check if it works if both are misaligned
//         let bits = Buffer.alloc(Math.floor((sz-1)/8)+1), offBit = offset%8, szOff = sz%8
//         packet.copy(bits, 0, offset/8, (Math.floor((offset+sz-1)/8)+1))
//         // console.log("parsed", f.name, 'from', offset, 'for', sz, bits.toString('hex'));
//         if (offBit !== 0) bits = bits.map((bit, i, bits) => (bit<<offBit) | ((bits[i+1] || 0) >> (8 - offBit)))
//         if (szOff !== 0) bits[bits.length-1] &= ~(255>>szOff)
            
//         //todo add all of these
//         if (f.represents === 0) {
//             let n = 0;
//             bits.forEach((bit, i) => {
//                 if (i !== bits.length-1 || szOff === 0) n+=(bit<<(i*8))
//                 else n+=((bit<<(i*8))>>(8-szOff))
//             }) //little endian
//             //console.log("converted: ", bits, "to", n, sz);
//             bits = n;
//         }
//         else if (f.represents === 4) content = bits
//         else bits = bits.toString('hex')

//         //console.log("parsed", f.name, 'from', offset, 'for', sz);
//         offset+=sz
//         entries.push([f.name, bits])
//     })
//     entries.push(['_CONTENT', content])
//     return Object.fromEntries(entries)
// }

// let pcap_session = createSession('lo0', {
//     filter: 'tcp port 3000 or udp port 3000'
// });
// // let pcap_session = createSession('lo0', {});
// pcap_session.on('packet', function (raw_packet) {
//     const dec =decode(raw_packet); //may want to compare my parsing to this
//     //this is a pcap header
//     const h = raw_packet.header
//     const tvSec = h.readUInt32LE()
//     const tvUSec = h.readUInt32LE(4)
//     const capLen = h.readUInt32LE(8)
//     const len = h.readUInt32LE(12)
//     const linkType = raw_packet.link_type

//     //this is captured packet
    
//     const pac = raw_packet.buf.subarray(0, len)
//     // console.log(dec);

//     const ourParsed = decapsulatePacket(pac, proj.layers[1].frames[0]);
//     // console.log(ourParsed);
    
//     if (ourParsed._CONTENT[0]>>4 === 4) {
//         const IPv4Parsed = decapsulatePacket(ourParsed._CONTENT, proj.layers[0].frames[0])
//         console.log(IPv4Parsed);
//     }
    
//     //note for ethernet frames the preamble and trailer are not included
// });

// import { spawn } from "node:child_process";
// import { assert } from "node:console";
// import * as fs from "fs";

// function send(packet, len, ethtype) {
//     //seems as if it works as of right now.
//     //will stress test first
//     //if something works will add assertions
//     console.log(packet.subarray(0, len).toString('hex'));
// }
// function logHeader(packet) {
//     //seems as if it works as of right now.
//     //will stress test first
//     //if something works will add assertions
//     console.log("len:", packet.readUInt32LE(20), "caplen:", packet.readUInt32LE(16), "timeval:", packet.readBigInt64LE(0));
// }

// const proc = spawn('sudo', ['./a.out', 'lo0', 'ip and port 80'])
// // const proc = spawn('osascript', ["-e", "do shell script \"./a.out lo0\" with administrator privileges"])
// let partial = Buffer.alloc(128*1024) //128k should be enough to hold even the largest packet
// let partialLen = 0
// let etherType;
// let file = fs.createWriteStream('./log.txt')
// proc.on('error', err => console.log("process emitted error", err))
// proc.on('close', (code, signal) => console.log("process closed", code, signal))
// proc.stdout.on('data', (packet) => {
//     if (file) file.write(packet.toString('hex')+'\n')
//     if (etherType === undefined) {
//         etherType = packet.readUInt32LE(0)
//         console.log("ETHERTYPE:", etherType);
//         packet = packet.subarray(4)
//     }
//     // there is absolutely no way there will be less than 16 bits written like this.
//     // I doubt that headers will ever be fractured
//     if (partialLen && partialLen < 24) {
//         assert(false)
//         const wrsz = Math.min(24, packet.length)
//         packet.copy(partial, partialLen, 0, wrsz)
//         partialLen+=wrsz
//         if (wrsz===packet.length)return
//         packet = packet.subarray(wrsz)
//     }
//     if (partialLen) {
//         assert(partialLen >= 24)
//         const len = partial.readUInt32LE(20)
//         if (len > partialLen+packet.length-24) {
//             console.log("wrote whole to partial");
            
//             packet.copy(partial, partialLen, 0, packet.length)
//             partialLen+=packet.length
//             return
//         } else {
//             //copy up to the end of the packet
//             packet.copy(partial, partialLen, 0, len+24-partialLen)
//             //send it
//             console.log('RECONSTRUCTED PACKET FROM PARTIALS!', packet.length, len, partialLen, len+24-partialLen);
//             send(partial, len+24, etherType)
//             packet = packet.subarray(len+24-partialLen)
//             partialLen = 0
//         }
//     }
//     //send packets from the message in a loop
//     while (packet.length >= 24) {
//         const len = packet.readUInt32LE(20)
//         logHeader(packet)
//         console.log('readlen', packet.length, "(", len+24>packet.length, ")");
        
//         if (len+24>packet.length) break
//         //packet.copy(partial, partialLen, 0, len+24-partialLen)
//         //send it
//         console.log('got packet:',len+24, '/', packet.length);
        
//         send(packet, len+24, etherType)
//         packet = packet.subarray(len+24)
//     }
//     //if there is any left put it in partial
//     assert(partialLen === 0)
//     if (packet.length) {
//         packet.copy(partial, partialLen, 0, packet.length)
//         console.log(packet.length, "PARTIAL");
//         console.log(packet.toString('hex'));
//         partialLen = packet.length
//     }
// })
// proc.stderr.on("data", (err) => {
//     console.log("STDERR!!!", err.toHex());
//     assert(false)
// })