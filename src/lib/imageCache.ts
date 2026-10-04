// Photo cache used by Avatar and the document grid: each remote image is
// downloaded once into the app's cache folder and reused offline.

import * as RNFS from '@dr.pogodin/react-native-fs';

const memory = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

// Signed URLs change their query string, so the cache key ignores it.
function cacheKey(url: string): string {
  const base = url.split('?')[0];
  let hash = 5381;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) + hash + base.charCodeAt(i)) >>> 0;
  }
  const ext = (base.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
  return `img_${hash.toString(36)}.${ext}`;
}

export function cachedPathSync(url: string): string | null {
  return memory.get(cacheKey(url)) ?? null;
}

export async function cachedImage(url: string): Promise<string | null> {
  if (!url || !/^https?:/i.test(url)) {
    return url || null;
  }
  const key = cacheKey(url);
  const known = memory.get(key);
  if (known) {
    return known;
  }
  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  const task = (async () => {
    const path = `${RNFS.CachesDirectoryPath}/${key}`;
    try {
      if (!(await RNFS.exists(path))) {
        const result = await RNFS.downloadFile({fromUrl: url, toFile: path}).promise;
        if (result.statusCode && result.statusCode >= 400) {
          await RNFS.unlink(path).catch(() => {});
          return null;
        }
      }
      const uri = `file://${path}`;
      memory.set(key, uri);
      return uri;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}

/** Drops a cached copy (after the photo is changed). */
export async function forgetImage(url: string) {
  const key = cacheKey(url);
  memory.delete(key);
  await RNFS.unlink(`${RNFS.CachesDirectoryPath}/${key}`).catch(() => {});
}
