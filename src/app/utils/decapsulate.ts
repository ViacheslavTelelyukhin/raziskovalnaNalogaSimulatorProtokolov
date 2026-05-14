import { frameField, frame, FIELD_TYPES } from "../../types";

export function hexStringToArrayBuffer(hex: string) {
    const byteArray = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return byteArray.buffer;
}

function parseSz(size:string, sizeTotal: number, currentOffset: number, parsedEntries: [string, any][]): number {
    let sz
    if (isNaN(parseInt(size))) {
        let func: Function | null = null;
        eval('func = '+size)
        if (typeof func !== 'function') throw new Error('invalid function')
        sz = (func as Function)(Object.fromEntries(parsedEntries))
        if (typeof sz !== 'number') throw new Error('bad function '+size)
    } else sz = parseInt(size)
    //The rest of the packet
    if (sz === -1) sz = sizeTotal-currentOffset
    return sz
}

function alignBuffer(size:number, offset: number, packet: Uint8Array) {
    
    let bits = new Uint8Array((((offset+size-1)>>3)+1)-(offset>>3)),
        offBit = offset&7, //empty bits at the start of the first byte
        szOff = (8-((size+offset)&7))&7 //empty bits at the end of the last byte
    bits.set(packet.subarray(offset/8, (((offset+size-1)>>3)+1)), 0)
    
    //align to end of rightmost byte
    if (szOff !== 0) bits = bits.map((bit, i, bits) => (bit>>szOff) | ((i ? bits[i-1] : 0) << (8-szOff)))
    
    //check if leftmost bit has any data
    if (szOff+offBit>=8) bits = bits.subarray(1)
    offBit = (offBit+szOff)&7
    //set leftmost bit to correct value
    if (offBit !== 0) bits[0] &= (255>>offBit)
    return bits
}

function parseValue(bits:Uint8Array, represents: FIELD_TYPES) {
    switch (represents) {
        case FIELD_TYPES.NUMBER_BE:
        //note that parsing poorly aligned (multibyte not aligned to a byte) little endian numbers can be unpredictable and should be carefully considered when testing protocol
        case FIELD_TYPES.NUMBER_LE: {
            let n = 0;
            bits.forEach((bit, j) => {
                const i = (FIELD_TYPES.NUMBER_BE === represents ? ((bits.byteLength-1)-j) : j); //endiannes
                n+=(bit<<(i*8))
            })
            return n
        } case FIELD_TYPES.CONTENTS:
            return bits;
        case FIELD_TYPES.BITS: 
            return bits = (bits as any).toHex()
        case FIELD_TYPES.STRING:
            return new TextDecoder().decode(bits) as any
    }
}

export const decapsulatePacket = (packet: Uint8Array, frame: frame) => {
    let content, offset = 0;
    const entries: [string, any][] = [], szTot = packet.byteLength*8
    const fieldSizeEntries: [string, number][] = []

    frame.fields.forEach((f: frameField, fi: number) => {
        const sz = parseSz(f.size as string, szTot, offset, entries)
        
        const bits = alignBuffer(sz, offset, packet)

        const value = parseValue(bits, f.represents)
        if (f.represents === FIELD_TYPES.CONTENTS) {
            content = value
            fieldSizeEntries.push(["_CONTENT", sz])
        } else fieldSizeEntries.push([f.name, sz])

        offset+=sz
        entries.push([f.name, value])
    })

    entries.push(['_SIZES', fieldSizeEntries])
    entries.push(['_NAME', frame.name])
    entries.push(['_CONTENT', content])
    return Object.fromEntries(entries)
}