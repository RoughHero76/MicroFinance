// Lets lib/image.web.ts show the crop and webcam dialogs without knowing
// about screens: the host component (Hosts.web.tsx) registers them.

export type ImageKind = 'profile' | 'document';

export interface ImageHost {
  /** Opens the cropper; resolves with the cropped JPEG, or null on cancel. */
  crop(file: Blob, kind: ImageKind): Promise<Blob | null>;
  /** Opens the webcam; resolves with a photo, or null on cancel. Rejects when the camera can't be used. */
  webcam(): Promise<File | null>;
}

let host: ImageHost | null = null;

export function registerImageHost(next: ImageHost | null) {
  host = next;
}

export function getImageHost(): ImageHost | null {
  return host;
}
