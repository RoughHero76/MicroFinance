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
