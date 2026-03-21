import { useEffect } from 'react';
import { syncService } from '@/components/SyncService';

export default function AppSyncBootstrap() {
  useEffect(() => {
    syncService.startAutoSync();
    return () => syncService.stopAutoSync();
  }, []);

  return null;
}