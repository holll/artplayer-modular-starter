import { safeUrlKey } from "./utils.js";

const DB_NAME = "artplayer_progress_db";
const DB_VERSION = 1;
const STORE_NAME = "progress";

let __dbPromise = null;

function openDB() {
  if (__dbPromise) return __dbPromise;

  __dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return __dbPromise;
}

export async function dbGet(url) {
  const key = safeUrlKey(url);
  if (!key) return null;

  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function dbPut(url, time, duration, meta = {}) {
  const key = safeUrlKey(url);
  if (!key) return false;

  const db = await openDB();
  const payload = {
    url: key,
    time: Number(time) || 0,
    duration: Number(duration) || 0,
    updatedAt: Date.now(),
    type: meta.type || "auto",
    isLive: !!meta.isLive,
  };

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.objectStore(STORE_NAME).put(payload);
  });
}

export async function dbDel(url) {
  const key = safeUrlKey(url);
  if (!key) return false;

  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.objectStore(STORE_NAME).delete(key);
  });
}
