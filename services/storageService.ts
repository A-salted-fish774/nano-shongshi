import { ChatSession } from '../types';

const DB_NAME = 'nano_banana_db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

let dbInstance: IDBDatabase | null = null;

// Initialize or Open Database
export const initDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Could not open IndexedDB");
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };
  });
};

// Save (Insert or Update) a Session
export const saveSessionToDB = async (session: ChatSession) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(session);
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to save session to DB:", error);
  }
};

// Delete a Session
export const deleteSessionFromDB = async (id: string) => {
   try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to delete session from DB:", error);
  }
};

// Get All Sessions
export const getAllSessionsFromDB = async (): Promise<ChatSession[]> => {
  try {
    const db = await initDB();
    return new Promise<ChatSession[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result as ChatSession[]);
        };
        request.onerror = () => reject(request.error);
    });
  } catch (error) {
      console.error("Failed to get sessions:", error);
      return [];
  }
};