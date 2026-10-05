// Keeps a copy of recently opened PDFs in IndexedDB (inside the app's own
// data folder), so they reopen from the Recent list with one click even
// though the webview never sees the original file path.

const DB = "study-pdfs";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function putPdf(key: string, bytes: Uint8Array): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(bytes, key));
  } catch {
    /* quota or unavailable: the PDF still opens, it just won't be cached */
  }
}

export async function getPdf(key: string): Promise<Uint8Array | null> {
  try {
    const v = await tx<unknown>("readonly", (s) => s.get(key));
    if (v instanceof Uint8Array) return v;
    if (v instanceof ArrayBuffer) return new Uint8Array(v);
    return null;
  } catch {
    return null;
  }
}

export async function deletePdf(key: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(key));
  } catch {
    /* ignore */
  }
}
