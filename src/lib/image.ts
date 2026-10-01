// Image rules (F-9): every camera or gallery pick is cropped and compressed
// before upload; the original full-size photo is never sent.

import ImagePicker, {type Image} from 'react-native-image-crop-picker';
import i18n from '@/i18n';
import {toast} from '@/ui/Toast';
import {ensurePermission, openAppSettings} from './permissions';

export type ImageKind = 'profile' | 'document';
export type ImageSource = 'camera' | 'gallery';

export interface PickedImage {
  uri: string;
  type: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

const OPTIONS = {
  // Profile and lead photos: square, 512px, JPEG 0.8 (~60–90 KB).
  profile: {
    width: 512,
    height: 512,
    cropping: true,
    cropperCircleOverlay: false,
    compressImageQuality: 0.8,
    freeStyleCropEnabled: false,
  },
  // Documents: free crop and rotate, long edge ≤1600px, JPEG 0.75 (<400 KB).
  document: {
    cropping: true,
    freeStyleCropEnabled: true,
    compressImageMaxWidth: 1600,
    compressImageMaxHeight: 1600,
    compressImageQuality: 0.75,
  },
} as const;

function toPicked(image: Image, kind: ImageKind): PickedImage {
  const ext = image.mime === 'image/png' ? 'png' : 'jpg';
  return {
    uri: image.path,
    type: image.mime || 'image/jpeg',
    name: `${kind}_${Date.now()}.${ext}`,
    size: image.size,
    width: image.width,
    height: image.height,
  };
}

function isCancel(error: unknown) {
  return (error as {code?: string})?.code === 'E_PICKER_CANCELLED';
}

/** Returns null when the user cancels. */
export async function pickImage(kind: ImageKind, source: ImageSource): Promise<PickedImage | null> {
  const options = {...OPTIONS[kind], mediaType: 'photo' as const, forceJpg: true, includeExif: false};
  // Asked the first time the camera is used. After "Don't allow" twice
  // Android stops asking, so point to the app's settings instead.
  if (source === 'camera') {
    const status = await ensurePermission('camera');
    if (status !== 'granted') {
      if (status === 'blocked') {
        toast.error(i18n.t('ui.cameraBlocked'), {
          message: i18n.t('ui.cameraBlockedHint'),
          action: {label: i18n.t('ui.openSettings'), onPress: () => openAppSettings()},
        });
      }
      return null;
    }
  }
  try {
    const image = source === 'camera' ? await ImagePicker.openCamera(options) : await ImagePicker.openPicker(options);
    return toPicked(image, kind);
  } catch (error) {
    if (isCancel(error)) {
      return null;
    }
    throw error;
  }
}

/** Several documents at once from the gallery (each cropped in turn). */
export async function pickDocuments(): Promise<PickedImage[]> {
  try {
    const images = await ImagePicker.openPicker({
      ...OPTIONS.document,
      cropping: false,
      multiple: true,
      mediaType: 'photo',
      forceJpg: true,
    });
    const list = Array.isArray(images) ? images : [images];
    const cropped: PickedImage[] = [];
    for (const image of list) {
      try {
        const result = await ImagePicker.openCropper({...OPTIONS.document, path: image.path, mediaType: 'photo'});
        cropped.push(toPicked(result, 'document'));
      } catch (error) {
        if (!isCancel(error)) {
          throw error;
        }
      }
    }
    return cropped;
  } catch (error) {
    if (isCancel(error)) {
      return [];
    }
    throw error;
  }
}

/** A file part for FormData. */
export function formFile(image: PickedImage) {
  return {uri: image.uri, type: image.type, name: image.name} as unknown as Blob;
}
