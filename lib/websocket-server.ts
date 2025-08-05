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

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

export const emitNewOrder = (order: boolean) => {
  io.emit('new-order', order);
};
export const emitSyncStatus = (status: boolean) => {
  io.emit('sync-status', status);
};

httpServer.listen(4000, () => {
  console.log('✅ Socket.IO server running on http://localhost:4000');
});
