// src/hooks/useSocket.ts
import { useEffect } from 'react';
import { socketClient as socket} from '@/lib/socket-client';



export const useSocket = (
  onNewOrder: (order: boolean) => void,
  onSyncStatus?: (status: boolean) => void
) => {
  useEffect(() => {

    socket.on('connect', () => {
      console.log('Connected to WebSocket server, CLient id: ', socket?.id);
    });

    socket.on('order-created', (order: boolean) => {
      console.log('New order received');
      onNewOrder(order);
    });
    socket.on('order-updated', (order: boolean) => {
      console.log('order update request received');
      onNewOrder(order);
    });

    socket.on('sync-status', (status: boolean) => {
      console.log('Sync status update:', status);
      onSyncStatus?.(status);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from WebSocket server');
    });

  }, [onNewOrder, onSyncStatus]);
};
