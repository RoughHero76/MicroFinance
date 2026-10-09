// The web photo cropper (X8). Same rules as the phone: profile photos are a
// locked square saved at up to 512px; documents can be cropped freely, set
// to a square or an A4 frame, and rotated, then are saved at up to 1600px.
// The full-size picture is never uploaded: only the cropped JPEG is.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  A4_PORTRAIT,
  DOCUMENT_QUALITY,
  fitSize,
  initialBox,
  moveBox,
  outputFor,
  PROFILE_QUALITY,
  resizeBox,
  type Box,
  type Handle,
  type Size,
} from '@/lib/cropMath';
import {useTheme} from '@/theme';
import type {ImageKind} from './imageHost';

type Shape = 'free' | 'square' | 'a4';
const ASPECT: Record<Shape, number | null> = {free: null, square: 1, a4: A4_PORTRAIT};

const CORNERS: Handle[] = ['nw', 'ne', 'sw', 'se'];
const EDGES: Handle[] = ['n', 's', 'e', 'w'];

/** Turns the file into a canvas, honouring the photo's own rotation (EXIF). */
async function toCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

function rotated(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.height;
  out.height = source.width;
  const ctx = out.getContext('2d')!;
  ctx.translate(out.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(source, 0, 0);
  return out;
}

export function CropDialog({
  file,
  kind,
  onDone,
}: {
  file: Blob;
  kind: ImageKind;
  onDone: (result: Blob | null) => void;
}) {
  const {t} = useTranslation();
  const theme = useTheme();
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [shape, setShape] = useState<Shape>(kind === 'profile' ? 'square' : 'free');
  const [box, setBox] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);
  const stage = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{handle: Handle | 'move'; x: number; y: number; box: Box} | null>(null);
  const aspect = ASPECT[shape];

  const display: Size | null = useMemo(() => {
    if (!source) return null;
    const maxW = Math.min(560, window.innerWidth - 64);
    const maxH = Math.min(380, window.innerHeight * 0.5);
    return fitSize({w: source.width, h: source.height}, maxW, maxH);
  }, [source]);

  useEffect(() => {
    let alive = true;
    toCanvas(file)
      .then(canvas => alive && setSource(canvas))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [file]);

  // Draw the picture, and start a fresh box when the picture or shape changes.
  useEffect(() => {
    if (!source || !display || !stage.current) return;
    const canvas = stage.current;
    canvas.width = display.w;
    canvas.height = display.h;
    canvas.getContext('2d')!.drawImage(source, 0, 0, display.w, display.h);
    setBox(initialBox(display, aspect));
  }, [source, display, aspect]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || !display) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      setBox(d.handle === 'move' ? moveBox(d.box, dx, dy, display) : resizeBox(d.box, d.handle, dx, dy, display, aspect));
    },
    [display, aspect],
  );

  const start = (handle: Handle | 'move') => (e: React.PointerEvent) => {
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {handle, x: e.clientX, y: e.clientY, box};
  };
  const end = () => {
    drag.current = null;
  };

  const save = async () => {
    if (!source || !display || !box) return;
    setBusy(true);
    const o = outputFor(box, display, {w: source.width, h: source.height}, kind);
    const out = document.createElement('canvas');
    out.width = o.w;
    out.height = o.h;
    out.getContext('2d')!.drawImage(source, o.sx, o.sy, o.sw, o.sh, 0, 0, o.w, o.h);
    out.toBlob(blob => onDone(blob), 'image/jpeg', kind === 'profile' ? PROFILE_QUALITY : DOCUMENT_QUALITY);
  };

  // Esc cancels.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const c = theme.colors;
  const handleStyle = (h: Handle): React.CSSProperties => {
    const corner = h.length === 2;
    const vertical = h === 'n' || h === 's';
    const w = corner ? 14 : vertical ? 28 : 10;
    const ht = corner ? 14 : vertical ? 10 : 28;
    const pos: React.CSSProperties = {};
    if (h.includes('n')) pos.top = -ht / 2;
    if (h.includes('s')) pos.bottom = -ht / 2;
    if (h.includes('w')) pos.left = -w / 2;
    if (h.includes('e')) pos.right = -w / 2;
    if (vertical) pos.left = `calc(50% - ${w / 2}px)`;
    if (h === 'e' || h === 'w') pos.top = `calc(50% - ${ht / 2}px)`;
    const cursor = {n: 'ns', s: 'ns', e: 'ew', w: 'ew', ne: 'nesw', sw: 'nesw', nw: 'nwse', se: 'nwse'}[h];
    return {
      position: 'absolute',
      width: w,
      height: ht,
      background: c.white,
      borderRadius: 3,
      cursor: `${cursor}-resize`,
      touchAction: 'none',
      ...pos,
    };
  };
  const handles = aspect ? CORNERS : [...CORNERS, ...EDGES];

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 99,
    border: `1px solid ${active ? c.primary : c.border}`,
    background: active ? c.primarySoft : 'transparent',
    color: active ? c.primary : c.text,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
  });

  return (
    <div style={{position: 'fixed', inset: 0, zIndex: 200000, display: 'grid', placeItems: 'center'}}>
      <div style={{position: 'absolute', inset: 0, background: c.scrim}} onClick={() => onDone(null)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(kind === 'profile' ? 'web.cropProfile' : 'web.cropDocument')}
        style={{
          position: 'relative',
          background: c.surface,
          color: c.text,
          borderRadius: 20,
          padding: 20,
          width: 'min(640px, 94vw)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        }}>
        <div style={{fontWeight: 700, fontSize: 17, marginBottom: 12}}>
          {t(kind === 'profile' ? 'web.cropProfile' : 'web.cropDocument')}
        </div>

        {failed ? (
          <div style={{padding: 24, color: c.danger}}>{t('web.cropFailed')}</div>
        ) : (
          <div style={{display: 'grid', placeItems: 'center', background: c.surface2, borderRadius: 12, padding: 14}}>
            <div
              style={{position: 'relative', width: display?.w ?? 200, height: display?.h ?? 150, touchAction: 'none'}}
              onPointerMove={onPointerMove}
              onPointerUp={end}
              onPointerCancel={end}>
              <canvas ref={stage} style={{width: display?.w, height: display?.h, display: 'block'}} />
              {box ? (
                <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
                  <div
                    onPointerDown={start('move')}
                    style={{
                      position: 'absolute',
                      left: box.x,
                      top: box.y,
                      width: box.w,
                      height: box.h,
                      border: `2px solid ${c.white}`,
                      boxShadow: `0 0 0 9999px ${c.scrim}`,
                      cursor: 'move',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                      boxSizing: 'border-box',
                    }}>
                    {handles.map(h => (
                      <div key={h} onPointerDown={start(h)} style={handleStyle(h)} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '12px 0 4px'}}>
          <button type="button" style={chip(false)} onClick={() => source && setSource(rotated(source))}>
            ⟲ {t('web.rotate')}
          </button>
          {kind === 'document' ? (
            <>
              <span style={{flex: 1}} />
              {(['free', 'square', 'a4'] as Shape[]).map(s => (
                <button key={s} type="button" style={chip(shape === s)} onClick={() => setShape(s)}>
                  {t(`web.shape.${s}`)}
                </button>
              ))}
            </>
          ) : null}
        </div>
        <div style={{color: c.muted, fontSize: 12, marginBottom: 14}}>
          {t(kind === 'profile' ? 'web.cropProfileHint' : 'web.cropDocumentHint')}
        </div>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
          <button
            type="button"
            onClick={() => onDone(null)}
            style={{padding: '9px 16px', border: 0, background: 'transparent', color: c.muted, fontWeight: 600, cursor: 'pointer'}}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!box || busy}
            onClick={save}
            style={{
              padding: '9px 20px',
              border: 0,
              borderRadius: 10,
              background: c.primary,
              color: c.onPrimary,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: !box || busy ? 0.5 : 1,
            }}>
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
