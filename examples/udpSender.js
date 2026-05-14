import { createSocket } from "node:dgram";

// fetch("http://127.0.0.1:10001")
const client = createSocket('udp4');
client.bind(10002);
const message = Buffer.from('A');

client.send(message, 10001, 'localhost', (err) => {
  if (err) {
    console.error('Failed to send message:', err);
  } else {
    console.log('Message sent to server!');
  }
  
  client.close();
});