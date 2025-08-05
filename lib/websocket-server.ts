import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  socket.on('on-order-create', (status: boolean) => {
    console.log('New order received');
    io.emit('order-created', status);
  });

  socket.on('on-order-update', (status: boolean) => {
    console.log('New order received');
    io.emit('order-updated', status);
  });


  socket.on('on-sync', (status: boolean) => {
    console.log('Status sync received:', status);
    io.emit('sync-status', status);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

httpServer.listen(4000, () => {
  console.log('Socket.IO server running on http://localhost:4000');
});
