// Image rules on the web (F-9), same as the phone: every pick is cropped
// and compressed before upload and the original is never sent. A phone
// browser opens the camera; a computer offers a file, a drop (see Hosts) or
// the webcam. The cropper itself is src/web/CropDialog.web.tsx.

import i18n from '@/i18n';
import {getImageHost, type ImageKind} from '@/web/imageHost';
import {toast} from '@/ui/Toast';

export type {ImageKind};
export type ImageSource = 'camera' | 'gallery';

export interface PickedImage {
  uri: string;
  type: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

// The cropped files by their object URL, so formFile() can hand the real
// file to FormData.
const files = new Map<string, File>();

async function toPicked(blob: Blob, kind: ImageKind): Promise<PickedImage> {
  const name = `${kind}_${Date.now()}.jpg`;
  const file = new File([blob], name, {type: 'image/jpeg'});
  const uri = URL.createObjectURL(file);
  files.set(uri, file);
  const bitmap = await createImageBitmap(file).catch(() => null);
  const result = {uri, type: file.type, name, size: file.size, width: bitmap?.width ?? 0, height: bitmap?.height ?? 0};
  bitmap?.close();
  return result;
}

/** Opens the system file chooser. Resolves with nothing when it is closed. */
function chooseFiles(multiple: boolean, capture?: 'environment'): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';
    const done = (list: File[]) => {
      input.remove();
      resolve(list);
    };
    input.addEventListener('change', () => done(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => done([]));
    document.body.appendChild(input);
    input.click();
  });
}

const isTouch = () => window.matchMedia?.('(pointer: coarse)').matches;

async function takePhoto(): Promise<File | null> {
  // Phones: the browser opens the camera app itself.
  if (isTouch()) return (await chooseFiles(false, 'environment'))[0] ?? null;
  const host = getImageHost();
  if (!host) return null;
  try {
    return await host.webcam();
  } catch {
    toast.error(i18n.t('ui.cameraBlocked'), {message: i18n.t('web.cameraBlockedHint')});
    return null;
  }
}

async function crop(file: Blob, kind: ImageKind): Promise<PickedImage | null> {
  const host = getImageHost();
  const cropped = host ? await host.crop(file, kind) : null;
  return cropped ? toPicked(cropped, kind) : null;
}

/** Returns null when the user cancels. */
export async function pickImage(kind: ImageKind, source: ImageSource): Promise<PickedImage | null> {
  const file = source === 'camera' ? await takePhoto() : (await chooseFiles(false))[0];
  return file ? crop(file, kind) : null;
}

/** Opens a photo that's already uploaded in the cropper again. */
export async function recropImage(kind: ImageKind, url: string): Promise<PickedImage | null> {
  let blob: Blob;
  try {
    const res = await fetch(url, {mode: 'cors'});
    if (!res.ok) throw new Error(String(res.status));
    blob = await res.blob();
  } catch {
    throw new Error(i18n.t('ui.photoDownloadFailed'));
  }
  return crop(blob, kind);
}

/** Several documents at once (each cropped in turn). */
export async function pickDocuments(): Promise<PickedImage[]> {
  const list = await chooseFiles(true);
  const out: PickedImage[] = [];
  for (const file of list) {
    const picked = await crop(file, 'document');
    if (picked) out.push(picked);
  }
  return out;
}

/** A file part for FormData. */
export function formFile(image: PickedImage) {
  return (files.get(image.uri) ?? new Blob([])) as unknown as Blob;
}
