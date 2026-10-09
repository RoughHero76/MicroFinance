// A tiny file store in the browser (IndexedDB) for what the phone keeps in
// the app's own folder: report history and loan statements.

export interface StoredFile {
  key: string;
  name: string;
  blob: Blob;
  size: number;
  modified: number;
}

const DB = 'evi-files';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, {keyPath: 'key'});
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export const putFile = (file: StoredFile) => run('readwrite', s => s.put(file));
export const getFile = (key: string) => run<StoredFile | undefined>('readonly', s => s.get(key));
export const deleteFile = (key: string) => run('readwrite', s => s.delete(key));
export const listFiles = (prefix: string) =>
  run<StoredFile[]>('readonly', s => s.getAll(IDBKeyRange.bound(prefix, `${prefix}￿`)));
