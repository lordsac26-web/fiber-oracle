// Offline storage utilities using IndexedDB for field data

const DB_NAME = 'FiberOracleDB';
const DB_VERSION = 2;

export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  CONFLICT: 'conflict'
};

// Initialize IndexedDB
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store for draft reports
      if (!db.objectStoreNames.contains('reports')) {
        const reportStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
        reportStore.createIndex('timestamp', 'timestamp', { unique: false });
        reportStore.createIndex('synced', 'synced', { unique: false });
      }

      // Store for cached reference data
      if (!db.objectStoreNames.contains('referenceData')) {
        const refStore = db.createObjectStore('referenceData', { keyPath: 'key' });
        refStore.createIndex('category', 'category', { unique: false });
      }

      // Store for test results
      if (!db.objectStoreNames.contains('testResults')) {
        const testStore = db.createObjectStore('testResults', { keyPath: 'id', autoIncrement: true });
        testStore.createIndex('timestamp', 'timestamp', { unique: false });
        testStore.createIndex('type', 'type', { unique: false });
      }

      // Store for photos
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        photoStore.createIndex('reportId', 'reportId', { unique: false });
      }
    };
  });
};

// Save draft report
export const saveDraftReport = async (report) => {
  const db = await initDB();
  const transaction = db.transaction(['reports'], 'readwrite');
  const store = transaction.objectStore('reports');
  
  const reportData = {
    ...report,
    timestamp: Date.now(),
    synced: false
  };

  return new Promise((resolve, reject) => {
    const request = store.add(reportData);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all draft reports
export const getDraftReports = async () => {
  const db = await initDB();
  const transaction = db.transaction(['reports'], 'readonly');
  const store = transaction.objectStore('reports');

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Update report sync status
export const markReportSynced = async (id) => {
  const db = await initDB();
  const transaction = db.transaction(['reports'], 'readwrite');
  const store = transaction.objectStore('reports');

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const report = getRequest.result;
      if (report) {
        report.synced = true;
        const updateRequest = store.put(report);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Delete synced reports
export const deleteSyncedReports = async () => {
  const db = await initDB();
  const transaction = db.transaction(['reports'], 'readwrite');
  const store = transaction.objectStore('reports');
  const index = store.index('synced');

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(true));
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Save test result
export const saveTestResult = async (testData) => {
  const db = await initDB();
  const transaction = db.transaction(['testResults'], 'readwrite');
  const store = transaction.objectStore('testResults');

  // Capture GPS if available and not provided
  let gpsData = testData.gps;
  if (!gpsData && navigator.geolocation) {
    try {
      gpsData = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date(pos.timestamp).toISOString()
          }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      });
    } catch (err) {
      console.log('GPS not available');
    }
  }

  const data = {
    ...testData,
    gps: gpsData,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get test results by type
export const getTestResults = async (type = null) => {
  const db = await initDB();
  const transaction = db.transaction(['testResults'], 'readonly');
  const store = transaction.objectStore('testResults');

  if (type) {
    const index = store.index('type');
    return new Promise((resolve, reject) => {
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } else {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};

// Save photo
export const savePhoto = async (photoData, reportId = null) => {
  const db = await initDB();
  const transaction = db.transaction(['photos'], 'readwrite');
  const store = transaction.objectStore('photos');

  const data = {
    ...photoData,
    reportId,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get photos by report
export const getPhotosByReport = async (reportId) => {
  const db = await initDB();
  const transaction = db.transaction(['photos'], 'readonly');
  const store = transaction.objectStore('photos');
  const index = store.index('reportId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(reportId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Cache reference data
export const cacheReferenceData = async (key, data, category) => {
  const db = await initDB();
  const transaction = db.transaction(['referenceData'], 'readwrite');
  const store = transaction.objectStore('referenceData');

  const refData = {
    key,
    data,
    category,
    cachedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(refData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get cached reference data
export const getCachedReferenceData = async (key) => {
  const db = await initDB();
  const transaction = db.transaction(['referenceData'], 'readonly');
  const store = transaction.objectStore('referenceData');

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
};