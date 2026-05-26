/*
Odprite simulacijo z zajemom prometa v demoProjekt.json in v konzoli napičite node udpSend.js.
Skripta bo iz porta 10001 na port 10000 poslala udp sporočilo z vsebino A.
Applikacija naj zajeme in dekasulira paket ter spremeni stanje elementa protokola.
*/

import { createSocket } from "node:dgram";

// fetch("http://127.0.0.1:10001")
const client = createSocket('udp4');
client.bind(10001);
const message = Buffer.from('A');

client.send(message, 10000, 'localhost', (err) => {
  if (err) {
    console.error('Failed to send message:', err);
  } else {
    console.log('Message sent to server!');
  }
  
  client.close();
});