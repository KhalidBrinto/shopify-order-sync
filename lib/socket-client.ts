// lib/socket-client.ts
import { io } from 'socket.io-client';


export const socketClient = io('http://localhost:4000', {
    transports: ['websocket'], // optional but recommended
    autoConnect: true,
});

