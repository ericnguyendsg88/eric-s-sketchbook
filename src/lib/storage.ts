/**
 * Browser-session persistence:
 *   - Binary file blobs  → IndexedDB (no meaningful size cap)
 *   - Demo metadata      → sessionStorage (small JSON)
 *   - Likes              → sessionStorage
 */

const DB_NAME   = "ericsketchbook-v1";
const STORE     = "files";
const KEY_DEMOS = "ericsketchbook-demos";
const KEY_LIKES = "ericsketchbook-likes";

// ─── IndexedDB ─────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function getBlobURL(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () =>
      resolve(req.result ? URL.createObjectURL(req.result as Blob) : null);
    req.onerror = () => reject(req.error);
  });
}

// ─── Demo metadata ─────────────────────────────────────────────────────────────

export interface StoredDemo {
  id: string;
  title: string;
  year: number;
  vibeNote: string;
  processNote?: string;
  lyrics: { text: string; finished: boolean }[];
  reactions: number;
  duration?: number;
  trimStart?: number;
  trimEnd?: number;
  hasAudio: boolean;
  hasCover: boolean;
}

export function saveDemos(metas: StoredDemo[]): void {
  try { sessionStorage.setItem(KEY_DEMOS, JSON.stringify(metas)); } catch {}
}

export function loadDemos(): StoredDemo[] {
  try {
    const raw = sessionStorage.getItem(KEY_DEMOS);
    return raw ? (JSON.parse(raw) as StoredDemo[]) : [];
  } catch { return []; }
}

// ─── Likes ─────────────────────────────────────────────────────────────────────

export interface LikesData {
  counts: Record<string, number>;
  liked: string[];
}

export function saveLikes(data: LikesData): void {
  try { sessionStorage.setItem(KEY_LIKES, JSON.stringify(data)); } catch {}
}

export function loadLikes(): LikesData {
  try {
    const raw = sessionStorage.getItem(KEY_LIKES);
    return raw ? (JSON.parse(raw) as LikesData) : { counts: {}, liked: [] };
  } catch { return { counts: {}, liked: [] }; }
}
