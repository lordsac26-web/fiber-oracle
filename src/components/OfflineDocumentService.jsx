// Offline Document Storage Service using IndexedDB
const DB_NAME = 'FiberOracleDocuments';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let db = null;

// Initialize IndexedDB
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
  });
};

// Save document to IndexedDB
export const saveDocumentOffline = async (id, type, title, data, metadata = {}) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const document = {
      id,
      type, // 'studyGuide', 'certificate', 'brochure', 'jobReport', 'manual'
      title,
      data, // ArrayBuffer or string content
      metadata,
      savedAt: new Date().toISOString(),
      size: data?.byteLength || data?.length || 0
    };

    const request = store.put(document);
    request.onsuccess = () => resolve(document);
    request.onerror = () => reject(request.error);
  });
};

// Get document from IndexedDB
export const getDocumentOffline = async (id) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// Get all documents by type
export const getDocumentsByType = async (type) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('type');
    const request = index.getAll(type);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Get all saved documents
export const getAllDocuments = async () => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Delete document from IndexedDB
export const deleteDocumentOffline = async (id) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// Check if document is saved offline
export const isDocumentSavedOffline = async (id) => {
  const doc = await getDocumentOffline(id);
  return doc !== null;
};

// Get total storage used
export const getStorageUsed = async () => {
  const docs = await getAllDocuments();
  return docs.reduce((total, doc) => total + (doc.size || 0), 0);
};

// Clear all offline documents
export const clearAllDocuments = async () => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

// Format bytes to human readable
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Download and save document for offline access
export const downloadAndSaveOffline = async (generateFn, id, type, title, metadata = {}) => {
  try {
    const data = await generateFn();
    await saveDocumentOffline(id, type, title, data, metadata);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to save document offline:', error);
    return { success: false, error };
  }
};

// Open document from offline storage
export const openOfflineDocument = async (id) => {
  const doc = await getDocumentOffline(id);
  if (!doc) return null;

  const blob = new Blob([doc.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  // Open in new tab or trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title}.pdf`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
  
  return doc;
};