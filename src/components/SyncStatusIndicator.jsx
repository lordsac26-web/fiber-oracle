import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';
import { syncService } from './SyncService';
import { toast } from 'sonner';
import moment from 'moment';

export default function SyncStatusIndicator({ compact = false }) {
  const [syncState, setSyncState] = useState({
    status: 'idle',
    progress: 0,
    message: '',
    totalSuccess: 0,
    totalConflicts: 0,
    totalErrors: 0,
    lastSyncTime: null
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
      
      if (state.status === 'success') {
        const message = state.totalConflicts > 0
          ? `Synced ${state.totalSuccess} items with ${state.totalConflicts} conflicts resolved`
          : `Successfully synced ${state.totalSuccess} items`;
        toast.success(message);
      } else if (state.status === 'error') {
        toast.error(`Sync failed: ${state.error}`);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    try {
      await syncService.syncAll();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    
    switch (syncState.status) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'conflict':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-500';
    
    switch (syncState.status) {
      case 'syncing':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'conflict':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    
    switch (syncState.status) {
      case 'syncing':
        return syncState.message || 'Syncing...';
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync Failed';
      case 'conflict':
        return 'Conflicts Resolved';
      default:
        return 'Ready';
    }
  };

  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
      >
        <div className={`${getStatusColor()} rounded-full p-1`}>
          {getStatusIcon()}
        </div>
        <span className="text-xs text-white">{getStatusText()}</span>
        {syncState.status === 'syncing' && (
          <span className="text-xs text-white/60">{syncState.progress}%</span>
        )}
      </button>
    );
  }

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`${getStatusColor()} rounded-lg p-2`}>
                {getStatusIcon()}
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">{getStatusText()}</h3>
                <p className="text-xs text-white/60">
                  {isOnline ? (
                    syncState.lastSyncTime 
                      ? `Last sync ${moment(syncState.lastSyncTime).fromNow()}`
                      : 'Never synced'
                  ) : 'No connection'}
                </p>
              </div>
            </div>
            
            {isOnline && syncState.status !== 'syncing' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync Now
              </Button>
            )}
          </div>

          {syncState.status === 'syncing' && (
            <div className="space-y-2">
              <Progress value={syncState.progress} className="h-2" />
              <p className="text-xs text-white/60">{syncState.message}</p>
            </div>
          )}

          {syncState.status === 'success' && (syncState.totalSuccess > 0 || syncState.totalConflicts > 0 || syncState.totalErrors > 0) && (
            <div className="flex gap-2 mt-3">
              {syncState.totalSuccess > 0 && (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {syncState.totalSuccess} synced
                </Badge>
              )}
              {syncState.totalConflicts > 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {syncState.totalConflicts} conflicts
                </Badge>
              )}
              {syncState.totalErrors > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {syncState.totalErrors} errors
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Sync Status</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`${getStatusColor()} rounded-lg p-2`}>
                    {getStatusIcon()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{getStatusText()}</p>
                    <p className="text-xs text-white/60">
                      {isOnline ? 'Connected' : 'No internet connection'}
                    </p>
                  </div>
                </div>

                {syncState.lastSyncTime && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Clock className="h-4 w-4" />
                    Last synced {moment(syncState.lastSyncTime).format('MMM D, h:mm A')}
                  </div>
                )}

                {isOnline && (
                  <Button
                    onClick={handleManualSync}
                    className="w-full"
                    disabled={syncState.status === 'syncing'}
                  >
                    {syncState.status === 'syncing' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}