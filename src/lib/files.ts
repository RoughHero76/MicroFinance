// Saving files to Download/<brand.storageFolder>/… through Android's media
// storage (Android 10+), which needs no storage permission (R-01). Android 9
// and older still write to the public folder directly.

import {PermissionsAndroid, Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {brand} from '@/brand';
import {getToken} from './session';

export interface SavedFile {
  /** content:// (Android 10+) or file path, for open/share. */
  uri: string;
  name: string;
}

async function legacyWritePermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) >= 29) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** Copies a file (e.g. a download in the cache) into Download/<brand>/<subfolder>/. */
export async function saveToDownloads(
  sourcePath: string,
  name: string,
  mimeType: string,
  subfolder?: string,
): Promise<SavedFile> {
  const parentFolder = [brand.storageFolder, subfolder].filter(Boolean).join('/');
  if (Platform.OS === 'android' && Number(Platform.Version) >= 29) {
    const uri = await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      {name, parentFolder, mimeType},
      'Download',
      sourcePath,
    );
    return {uri, name};
  }
  if (!(await legacyWritePermission())) throw new Error('storage-permission');
  const dir = `${
    ReactNativeBlobUtil.fs.dirs.LegacyDownloadDir ?? ReactNativeBlobUtil.fs.dirs.DownloadDir
  }/${parentFolder}`;
  if (!(await ReactNativeBlobUtil.fs.exists(dir))) await ReactNativeBlobUtil.fs.mkdir(dir);
  const dest = `${dir}/${name}`;
  await ReactNativeBlobUtil.fs.cp(sourcePath, dest);
  return {uri: `file://${dest}`, name};
}

/**
 * Downloads an authenticated API file (report, backup) with progress, then
 * saves it to Downloads. `path` is relative to /api.
 */
export async function downloadToDownloads(
  path: string,
  name: string,
  mimeType: string,
  opts: {subfolder?: string; onProgress?: (fraction: number) => void} = {},
): Promise<SavedFile> {
  const token = await getToken();
  const tmp = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${Date.now()}-${name}`;
  const res = await ReactNativeBlobUtil.config({fileCache: true, path: tmp, overwrite: true})
    .fetch('GET', `${brand.apiUrl}/api${path}`, token ? {Authorization: `Bearer ${token}`} : {})
    .progress((received, total) => {
      const r = Number(received);
      const t = Number(total);
      if (t > 0) opts.onProgress?.(r / t);
    });
  const status = res.info().status;
  if (status >= 400) {
    await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => undefined);
    throw new Error(`http-${status}`);
  }
  try {
    return await saveToDownloads(res.path(), name, mimeType, opts.subfolder);
  } finally {
    ReactNativeBlobUtil.fs.unlink(tmp).catch(() => undefined);
  }
}

/** Opens a saved file with whatever app handles it. */
export function openFile(file: SavedFile, mimeType: string) {
  return ReactNativeBlobUtil.android.actionViewIntent(file.uri.replace(/^file:\/\//, ''), mimeType);
}

/** Saves a remote file (e.g. a signed document URL) to Download/<brand>/<subfolder>/. */
export async function downloadUrlToDownloads(
  url: string,
  name: string,
  mimeType: string,
  subfolder?: string,
): Promise<SavedFile> {
  const tmp = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${Date.now()}-${name}`;
  const res = await ReactNativeBlobUtil.config({fileCache: true, path: tmp, overwrite: true}).fetch('GET', url);
  if (res.info().status >= 400) {
    await ReactNativeBlobUtil.fs.unlink(tmp).catch(() => undefined);
    throw new Error(`http-${res.info().status}`);
  }
  try {
    return await saveToDownloads(res.path(), name, mimeType, subfolder);
  } finally {
    ReactNativeBlobUtil.fs.unlink(tmp).catch(() => undefined);
  }
}

// --- Files kept inside the app (report history, statements): the app can
// list, open, share and delete these, which it can't do for files it wrote
// to the shared Downloads folder on Android 10+.

export interface AppFile {
  path: string;
  name: string;
  size: number;
  modified: number;
}

const appDir = (sub: string) => `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${sub}`;

/** Downloads an authenticated API file into the app's own folder. */
export async function downloadToApp(
  path: string,
  sub: string,
  name: string,
  opts: {onProgress?: (fraction: number) => void; method?: 'GET' | 'POST'; body?: object} = {},
): Promise<AppFile> {
  const token = await getToken();
  const dir = appDir(sub);
  if (!(await ReactNativeBlobUtil.fs.exists(dir))) await ReactNativeBlobUtil.fs.mkdir(dir);
  const dest = `${dir}/${name}`;
  const headers: Record<string, string> = token ? {Authorization: `Bearer ${token}`} : {};
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await ReactNativeBlobUtil.config({path: dest, overwrite: true})
    .fetch(
      opts.method ?? 'GET',
      `${brand.apiUrl}/api${path}`,
      headers,
      opts.body ? JSON.stringify(opts.body) : undefined,
    )
    .progress((received, total) => {
      const t = Number(total);
      if (t > 0) opts.onProgress?.(Number(received) / t);
    });
  if (res.info().status >= 400) {
    await ReactNativeBlobUtil.fs.unlink(dest).catch(() => undefined);
    throw new Error(`http-${res.info().status}`);
  }
  const stat = await ReactNativeBlobUtil.fs.stat(dest);
  return {path: dest, name, size: Number(stat.size), modified: Number(stat.lastModified)};
}

/** Newest first. */
export async function listAppFiles(sub: string): Promise<AppFile[]> {
  const dir = appDir(sub);
  if (!(await ReactNativeBlobUtil.fs.exists(dir))) return [];
  const stats = await ReactNativeBlobUtil.fs.lstat(dir);
  return stats
    .filter(s => s.type === 'file')
    .map(s => ({path: s.path, name: s.filename, size: Number(s.size), modified: Number(s.lastModified)}))
    .sort((a, b) => b.modified - a.modified);
}

export async function appFileExists(sub: string, name: string): Promise<AppFile | null> {
  const path = `${appDir(sub)}/${name}`;
  if (!(await ReactNativeBlobUtil.fs.exists(path))) return null;
  const stat = await ReactNativeBlobUtil.fs.stat(path);
  return {path, name, size: Number(stat.size), modified: Number(stat.lastModified)};
}

export const deleteAppFile = (path: string) => ReactNativeBlobUtil.fs.unlink(path);

export async function clearAppFolder(sub: string) {
  const dir = appDir(sub);
  if (await ReactNativeBlobUtil.fs.exists(dir)) await ReactNativeBlobUtil.fs.unlink(dir);
}

export const openAppFile = (file: AppFile, mimeType: string) =>
  ReactNativeBlobUtil.android.actionViewIntent(file.path, mimeType);

/** The system share sheet (WhatsApp, email…) with the file attached. */
export async function shareAppFile(file: AppFile, mimeType: string, title?: string) {
  const Share = require('react-native-share').default ?? require('react-native-share');
  try {
    await Share.open({url: `file://${file.path}`, type: mimeType, filename: file.name, title, failOnCancel: false});
  } catch {
    // Closing the share sheet isn't an error.
  }
}

export const saveAppFileToDownloads = (file: AppFile, mimeType: string, subfolder: string) =>
  saveToDownloads(file.path, file.name, mimeType, subfolder);

export const MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;
