import { base44 } from '@/api/base44Client';
import { initDB, getDraftReports, getTestResults, SYNC_STATUS } from './OfflineStorage';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
    this.listeners = [];
    this.lastSyncTime = null;
    this.syncErrors = [];
  }

  // Subscribe to sync status changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify all listeners
  notify(status) {
    this.listeners.forEach(listener => listener(status));
  }

  // Conflict resolution strategies
  resolveConflict(localData, serverData, strategy = 'last-write-wins') {
    switch (strategy) {
      case 'last-write-wins':
        return localData.lastModified > serverData.updated_date 
          ? { data: localData, source: 'local' }
          : { data: serverData, source: 'server' };
      
      case 'server-priority':
        return { data: serverData, source: 'server' };
      
      case 'local-priority':
        return { data: localData, source: 'local' };
      
      case 'merge':
        // Merge non-conflicting fields
        return {
          data: {
            ...serverData,
            ...localData,
            // Keep server's system fields
            id: serverData.id,
            created_date: serverData.created_date,
            updated_date: new Date().toISOString(),
            // Merge arrays if present
            photos: [...(serverData.photos || []), ...(localData.photos || [])].filter((v, i, a) => a.indexOf(v) === i)
          },
          source: 'merged'
        };
      
      default:
        return { data: localData, source: 'local' };
    }
  }

  // Sync draft reports
  async syncDraftReports() {
    const db = await initDB();
    const drafts = await getDraftReports();
    const unsyncedDrafts = drafts.filter(d => !d.synced);
    
    const results = {
      success: [],
      conflicts: [],
      errors: []
    };

    for (const draft of unsyncedDrafts) {
      try {
        // Update status to syncing
        await this.updateDraftStatus(draft.id, SYNC_STATUS.SYNCING);

        // Check if report exists on server (by job_number or other unique identifier)
        let serverReport = null;
        if (draft.job_number) {
          try {
            const existingReports = await base44.entities.JobReport.filter({ 
              job_number: draft.job_number 
            });
            serverReport = existingReports[0];
          } catch (err) {
            console.log('No existing report found');
          }
        }

        if (serverReport) {
          // Conflict detected - resolve it
          const resolution = this.resolveConflict(draft, serverReport, 'last-write-wins');
          
          if (resolution.source === 'local') {
            // Update server with local data
            await base44.entities.JobReport.update(serverReport.id, {
              ...draft,
              id: undefined,
              synced: undefined,
              syncStatus: undefined
            });
            results.conflicts.push({ 
              draft, 
              resolution: 'local-won',
              serverId: serverReport.id 
            });
          } else if (resolution.source === 'merged') {
            // Update server with merged data
            await base44.entities.JobReport.update(serverReport.id, {
              ...resolution.data,
              id: undefined,
              synced: undefined,
              syncStatus: undefined
            });
            results.conflicts.push({ 
              draft, 
              resolution: 'merged',
              serverId: serverReport.id 
            });
          } else {
            // Server won - just mark local as synced
            results.conflicts.push({ 
              draft, 
              resolution: 'server-won',
              serverId: serverReport.id 
            });
          }

          // Mark as synced
          await this.updateDraftStatus(draft.id, SYNC_STATUS.SUCCESS, true);
        } else {
          // No conflict - create new report
          const created = await base44.entities.JobReport.create({
            ...draft,
            id: undefined,
            synced: undefined,
            syncStatus: undefined,
            lastModified: undefined,
            version: undefined
          });

          await this.updateDraftStatus(draft.id, SYNC_STATUS.SUCCESS, true);
          results.success.push({ draft, serverId: created.id });
        }
      } catch (error) {
        console.error('Sync error:', error);
        await this.updateDraftStatus(draft.id, SYNC_STATUS.ERROR);
        results.errors.push({ draft, error: error.message });
      }
    }

    return results;
  }

  // Sync test results
  async syncTestResults() {
    const tests = await getTestResults();
    const unsyncedTests = tests.filter(t => !t.synced);
    
    const results = {
      success: [],
      errors: []
    };

    for (const test of unsyncedTests) {
      try {
        await this.updateTestStatus(test.id, SYNC_STATUS.SYNCING);

        await base44.entities.TestReport.create({
          ...test,
          id: undefined,
          synced: undefined,
          syncStatus: undefined,
          lastModified: undefined,
          version: undefined
        });

        await this.updateTestStatus(test.id, SYNC_STATUS.SUCCESS, true);
        results.success.push(test);
      } catch (error) {
        console.error('Test sync error:', error);
        await this.updateTestStatus(test.id, SYNC_STATUS.ERROR);
        results.errors.push({ test, error: error.message });
      }
    }

    return results;
  }

  // Update draft status
  async updateDraftStatus(id, status, synced = false) {
    const db = await initDB();
    const transaction = db.transaction(['draftReports'], 'readwrite');
    const store = transaction.objectStore('draftReports');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const draft = getRequest.result;
        if (draft) {
          draft.syncStatus = status;
          draft.synced = synced;
          const updateRequest = store.put(draft);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Update test status
  async updateTestStatus(id, status, synced = false) {
    const db = await initDB();
    const transaction = db.transaction(['testResults'], 'readwrite');
    const store = transaction.objectStore('testResults');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const test = getRequest.result;
        if (test) {
          test.syncStatus = status;
          test.synced = synced;
          const updateRequest = store.put(test);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Full sync
  async syncAll() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Device is offline');
      return;
    }

    this.isSyncing = true;
    this.notify({ status: 'syncing', progress: 0 });

    try {
      // Sync drafts
      this.notify({ status: 'syncing', progress: 25, message: 'Syncing reports...' });
      const draftResults = await this.syncDraftReports();

      // Sync test results
      this.notify({ status: 'syncing', progress: 75, message: 'Syncing test results...' });
      const testResults = await this.syncTestResults();

      this.lastSyncTime = Date.now();
      
      const totalSuccess = draftResults.success.length + testResults.success.length;
      const totalConflicts = draftResults.conflicts.length;
      const totalErrors = draftResults.errors.length + testResults.errors.length;

      this.notify({ 
        status: 'success', 
        progress: 100,
        totalSuccess,
        totalConflicts,
        totalErrors,
        lastSyncTime: this.lastSyncTime
      });

      return {
        draftResults,
        testResults,
        totalSuccess,
        totalConflicts,
        totalErrors
      };
    } catch (error) {
      console.error('Sync failed:', error);
      this.notify({ status: 'error', error: error.message });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Auto-sync when online
  startAutoSync(intervalMs = 60000) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncAll();
      }
    }, intervalMs);

    // Sync when coming back online
    window.addEventListener('online', () => {
      setTimeout(() => this.syncAll(), 1000);
    });
  }

  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
  }
}

export const syncService = new SyncService();