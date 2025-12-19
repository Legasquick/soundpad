import { SoundClip, AppData } from '../types';

const DB_NAME = 'SonicGridDB';
// Increased version to force an upgrade/reset if the schema was corrupted
const DB_VERSION = 2;
const STORE_FILES = 'files';
const STORE_META = 'metadata';

// Helper to open DB with better error logging
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Basic check for IDB support
    if (!('indexedDB' in window)) {
        reject(new Error("IndexedDB not supported"));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };

    request.onsuccess = () => resolve(request.result);
    
    request.onerror = () => {
        console.error("DB Open Error:", request.error);
        reject(request.error);
    };

    request.onblocked = () => {
        console.warn("DB Blocked: Please close other tabs of this app.");
        // We can't reject effectively here, but it explains hangs
    };
  });
};

export const saveFile = async (id: string, file: Blob): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        const req = store.put(file, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        req.onerror = () => reject(req.error);
    });
  } catch (e) {
      console.error("Failed to save file", e);
      throw e;
  }
};

export const getFile = async (id: string): Promise<Blob | undefined> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.warn("Failed to get file", e);
      return undefined;
  }
};

export const deleteFile = async (id: string): Promise<void> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
  } catch (e) {
      console.error("Failed to delete file", e);
  }
};

export const saveMetadata = async (data: AppData): Promise<void> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_META, 'readwrite');
        const store = tx.objectStore(STORE_META);
        store.put(data, 'appData');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
  } catch (e) {
      console.error("Failed to save metadata", e);
  }
};

export const getMetadata = async (): Promise<AppData | undefined> => {
  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_META, 'readonly');
        const store = tx.objectStore(STORE_META);
        const request = store.get('appData');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.warn("Failed to get metadata", e);
      return undefined;
  }
};