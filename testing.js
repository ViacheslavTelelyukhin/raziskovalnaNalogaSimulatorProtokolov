import { createSession } from "pcap";
let pcap_session = createSession('en0');
pcap_session.on('packet', function (raw_packet) {
    console.log(raw_packet);
});