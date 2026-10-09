// The arithmetic behind the web photo cropper (X8 on the phone). A crop box
// lives in "display" pixels, the size the picture is shown at; the saved
// photo is cut from the full-size picture using the same proportions.
// Pure functions so they can be tested without a browser.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const MIN_BOX = 40;

/** F-9: profile photos are square 512px; documents fit within 1600px. */
export const PROFILE_SIZE = 512;
export const DOCUMENT_MAX = 1600;
export const PROFILE_QUALITY = 0.8;
export const DOCUMENT_QUALITY = 0.75;
export const A4_PORTRAIT = 210 / 297;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** A centred box covering 90% of the picture, with the given proportions. */
export function initialBox(display: Size, aspect: number | null): Box {
  let w = display.w * 0.9;
  let h = display.h * 0.9;
  if (aspect) {
    if (w / h > aspect) w = h * aspect;
    else h = w / aspect;
  }
  return {x: (display.w - w) / 2, y: (display.h - h) / 2, w, h};
}

export function moveBox(box: Box, dx: number, dy: number, bounds: Size): Box {
  return {
    ...box,
    x: clamp(box.x + dx, 0, bounds.w - box.w),
    y: clamp(box.y + dy, 0, bounds.h - box.h),
  };
}

/** Drags one handle by (dx, dy). With an aspect only the corners are used. */
export function resizeBox(
  box: Box,
  handle: Handle,
  dx: number,
  dy: number,
  bounds: Size,
  aspect: number | null,
  min = MIN_BOX,
): Box {
  if (aspect) return resizeFixed(box, handle, dx, aspect, bounds, min);
  let left = box.x;
  let top = box.y;
  let right = box.x + box.w;
  let bottom = box.y + box.h;
  if (handle.includes('w')) left = clamp(left + dx, 0, right - min);
  if (handle.includes('e')) right = clamp(right + dx, left + min, bounds.w);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - min);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + min, bounds.h);
  return {x: left, y: top, w: right - left, h: bottom - top};
}

function resizeFixed(box: Box, handle: Handle, dx: number, aspect: number, bounds: Size, min: number): Box {
  const east = handle.includes('e');
  const south = handle.includes('s');
  // The corner opposite the dragged one stays where it is.
  const ax = east ? box.x : box.x + box.w;
  const ay = south ? box.y : box.y + box.h;
  const room = Math.min(east ? bounds.w - ax : ax, (south ? bounds.h - ay : ay) * aspect);
  const w = clamp(box.w + (east ? dx : -dx), Math.max(min, min * aspect), room);
  const h = w / aspect;
  return {x: east ? ax : ax - w, y: south ? ay : ay - h, w, h};
}

export interface Output {
  /** Where to cut from the full-size picture. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Size of the saved photo. */
  w: number;
  h: number;
}

/**
 * What to cut and what size to save: profile photos are squares of at most
 * 512px, documents keep their shape with the long edge at most 1600px.
 */
export function outputFor(box: Box, display: Size, source: Size, kind: 'profile' | 'document'): Output {
  const scale = source.w / display.w;
  const sx = Math.round(box.x * scale);
  const sy = Math.round(box.y * scale);
  const sw = Math.max(1, Math.min(Math.round(box.w * scale), source.w - sx));
  const sh = Math.max(1, Math.min(Math.round(box.h * scale), source.h - sy));
  if (kind === 'profile') {
    const side = Math.min(PROFILE_SIZE, Math.min(sw, sh));
    return {sx, sy, sw, sh, w: side, h: side};
  }
  const k = Math.min(1, DOCUMENT_MAX / Math.max(sw, sh));
  return {sx, sy, sw, sh, w: Math.round(sw * k), h: Math.round(sh * k)};
}

/** The size a picture is shown at: as large as fits, never enlarged past 1:1. */
export function fitSize(source: Size, maxW: number, maxH: number): Size {
  const k = Math.min(maxW / source.w, maxH / source.h, 1);
  return {w: Math.max(1, Math.round(source.w * k)), h: Math.max(1, Math.round(source.h * k))};
}
