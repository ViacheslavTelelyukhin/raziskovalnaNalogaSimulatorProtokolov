/*
Odprite simulacijo z zajemom prometa v demoProjekt.json in v konzoli napičite node udpSend.js.
Skripta bo iz na portu 10000 poslušala za udp sporočila in. izpisala njihovo vsebimo.
Applikacija naj zajeme in dekasulira paket ter spremeni stanje elementa protokola.
*/

// import http from "http";

// const server = http.createServer((req, res) => {
//     console.log('got');
//     setTimeout(() => res.end("Bye"), 6000)
// })

// server.listen(10001)
import { createSocket } from "node:dgram";
const server = createSocket('udp4'); // 'udp4' for IPv4

server.on('error', (err) => {
  console.log(`Server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`Server got: "${msg}" from ${rinfo.address}:${rinfo.port}`);
});

server.on('listening', () => {
  const address = server.address();
  console.log(`Server listening ${address.address}:${address.port}`);
});

server.bind(10000);