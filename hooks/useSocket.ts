// src/hooks/useSocket.ts
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;


export const useSocket = (
  onNewOrder: (order: boolean) => void,
  onSyncStatus?: (status: boolean) => void
) => {
  useEffect(() => {
    socket = io('http://localhost:4000');

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('new-order', (order: boolean) => {
      console.log('New order received');
      onNewOrder(order);
    });

    socket.on('sync-status', (status: boolean) => {
      console.log('🔄 Sync status update:', status);
      onSyncStatus?.(status); // only call if callback is provided
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from WebSocket server');
    });

    return () => {
      socket?.disconnect();
    };
  }, [onNewOrder, onSyncStatus]);
};
