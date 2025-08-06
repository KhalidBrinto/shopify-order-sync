"use client";
import Image from "next/image";
import { useSocket } from "@/hooks/useSocket";
import { useState } from "react";
import Link from "next/link";
import OrdersPage from "@/components/orderPage";
import WebhookManager from "@/components/webhook";
import { Button } from "@/components/ui/button";

interface SyncResult {
  success: boolean;
  message: string;
  totalOrdersProcessed: number;
  totalOrdersCreated: number;
  totalOrdersUpdated: number;
  errors: string[];
}

export default function Home() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);


  const startOrderSync = async () => {
    try {
      setIsSyncLoading(true);
      setSyncResult(null);
      
      const response = await fetch('/api/order-sync');
      const result: SyncResult = await response.json();
      
      setSyncResult(result);
      
      if (result.success) {
        console.log('Order sync completed:', result);
        // Refresh the orders page after successful sync
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.error('Order sync failed:', result);
      }
    } catch (error) {
      console.error('Error starting order sync:', error);
      setSyncResult({
        success: false,
        message: 'Failed to start sync',
        totalOrdersProcessed: 0,
        totalOrdersCreated: 0,
        totalOrdersUpdated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setIsSyncLoading(false);
    }
  };

  useSocket(
    (order) => {
      console.log("New order received");
      setRefreshKey((prev) => prev + 1);
    },
    (status) => {
      setIsSyncing(status);
    }
  );

  return (
    <div className="min-h-screen w-full">
      <h1 className="text-3xl font-bold text-center pt-20">Shopify Order Sync</h1>
      <div className="text-center space-y-4">

      <WebhookManager/>
        
        {/* Order Sync Button */}
        <div className="flex justify-center pt-5">
          <Button
            onClick={startOrderSync}
            disabled={isSyncLoading || isSyncing}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSyncLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Syncing Orders...
              </>
            ) : (
              'Start Order Sync'
            )}
          </Button>
        </div>

        {/* Sync Results */}
        {syncResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            syncResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-medium ${
              syncResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {syncResult.success ? '✅ Sync Completed' : '❌ Sync Failed'}
            </h3>
            <p className={`text-sm ${
              syncResult.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {syncResult.message}
            </p>
            {syncResult.success && (
              <div className="mt-2 text-sm text-green-700">
                <p>• Processed: {syncResult.totalOrdersProcessed} orders</p>
                <p>• Created: {syncResult.totalOrdersCreated} new orders</p>
                <p>• Updated: {syncResult.totalOrdersUpdated} existing orders</p>
              </div>
            )}
            {syncResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-700">Errors:</p>
                <ul className="text-xs text-red-600 mt-1 space-y-1">
                  {syncResult.errors.slice(0, 3).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {syncResult.errors.length > 3 && (
                    <li>• ... and {syncResult.errors.length - 3} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <OrdersPage refreshKey={refreshKey}/>
      </div>
    </div>
  );
}
