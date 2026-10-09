// Files on the web. Downloads go through the browser's own download bar
// (no Download/<brand> folder to write to); the report history and loan
// statements, which the phone keeps in the app's folder, are kept in the
// browser (IndexedDB). Same exports as files.ts.

import {brand} from '@/brand';
import {deleteFile, getFile, listFiles, putFile} from '@/web/idb';
import {getToken} from './session';

export interface SavedFile {
  uri: string;
  name: string;
}

export interface AppFile {
  path: string;
  name: string;
  size: number;
  modified: number;
}

export const MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: object;
  onProgress?: (fraction: number) => void;
}

/** Fetches an authenticated API file, reporting progress as it arrives. */
async function fetchApiBlob(path: string, opts: FetchOptions = {}): Promise<Blob> {
  const token = await getToken();
  const headers: Record<string, string> = token ? {Authorization: `Bearer ${token}`} : {};
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${brand.apiUrl}/api${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return readBody(res, opts.onProgress);
}

async function readBody(res: Response, onProgress?: (fraction: number) => void): Promise<Blob> {
  if (!res.ok) throw new Error(`http-${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !onProgress || !total) return res.blob();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(1, received / total));
  }
  return new Blob(chunks as BlobPart[], {type: res.headers.get('content-type') ?? ''});
}

/** Hands a file to the browser's download bar. */
function download(blob: Blob, name: string): SavedFile {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Opening the file later (the "Open" toast action) still needs the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  return {uri: url, name};
}

export async function downloadToDownloads(
  path: string,
  name: string,
  _mimeType: string,
  opts: {subfolder?: string; onProgress?: (fraction: number) => void} = {},
): Promise<SavedFile> {
  return download(await fetchApiBlob(path, {onProgress: opts.onProgress}), name);
}

/** Opens a downloaded file in a new tab. */
export async function openFile(file: SavedFile, _mimeType: string): Promise<void> {
  if (!window.open(file.uri, '_blank', 'noopener')) throw new Error('blocked');
}

/** Saves a remote file (e.g. a signed document URL). */
export async function downloadUrlToDownloads(
  url: string,
  name: string,
  _mimeType: string,
  _subfolder?: string,
): Promise<SavedFile> {
  return download(await readBody(await fetch(url)), name);
}

// --- Files kept in the browser: report history, statements.

const keyOf = (sub: string, name: string) => `${sub}/${name}`;

function toAppFile(f: {key: string; name: string; size: number; modified: number}): AppFile {
  return {path: f.key, name: f.name, size: f.size, modified: f.modified};
}

export async function downloadToApp(
  path: string,
  sub: string,
  name: string,
  opts: {onProgress?: (fraction: number) => void; method?: 'GET' | 'POST'; body?: object} = {},
): Promise<AppFile> {
  const blob = await fetchApiBlob(path, opts);
  const stored = {key: keyOf(sub, name), name, blob, size: blob.size, modified: Date.now()};
  await putFile(stored);
  return toAppFile(stored);
}

/** Newest first. */
export async function listAppFiles(sub: string): Promise<AppFile[]> {
  const all = await listFiles(`${sub}/`);
  return all.map(toAppFile).sort((a, b) => b.modified - a.modified);
}

export async function appFileExists(sub: string, name: string): Promise<AppFile | null> {
  const f = await getFile(keyOf(sub, name));
  return f ? toAppFile(f) : null;
}

export const deleteAppFile = (path: string) => deleteFile(path);

export async function clearAppFolder(sub: string) {
  for (const f of await listFiles(`${sub}/`)) await deleteFile(f.key);
}

async function blobOf(file: AppFile): Promise<Blob> {
  const f = await getFile(file.path);
  if (!f) throw new Error('missing');
  return f.blob;
}

export async function openAppFile(file: AppFile, mimeType: string): Promise<void> {
  const blob = await blobOf(file);
  const url = URL.createObjectURL(new Blob([blob], {type: mimeType}));
  if (!window.open(url, '_blank', 'noopener')) throw new Error('blocked');
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
}

/** The browser's share sheet where there is one; otherwise a download. */
export async function shareAppFile(file: AppFile, mimeType: string, title?: string) {
  const blob = new Blob([await blobOf(file)], {type: mimeType});
  const shareable = new File([blob], file.name, {type: mimeType});
  try {
    if (navigator.canShare?.({files: [shareable]})) {
      await navigator.share({files: [shareable], title});
      return;
    }
  } catch {
    return; // closing the share sheet isn't an error
  }
  download(blob, file.name);
}

export async function saveAppFileToDownloads(file: AppFile, mimeType: string, _subfolder: string): Promise<SavedFile> {
  return download(new Blob([await blobOf(file)], {type: mimeType}), file.name);
}

/** The phone saves a file from its cache folder; here the path is a URL. */
export async function saveToDownloads(
  sourcePath: string,
  name: string,
  _mimeType: string,
  _subfolder?: string,
): Promise<SavedFile> {
  return download(await readBody(await fetch(sourcePath)), name);
}
