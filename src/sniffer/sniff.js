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
