// P-12 on the web: a photo or document full screen. The phone's pinch and
// swipe become what a browser expects: arrows and the ← → keys for the next
// photo, the mouse wheel or a double-click to zoom, drag to move a zoomed
// photo, Esc or a click outside to close. A swipe still changes photo on a
// touch screen.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import {IconButton} from './IconButton';
import {Text} from './Text';

export interface Photo {
  uri: string;
  title?: string;
}

const MIN = 1;
const MAX = 5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function PhotoViewer({
  photos,
  index = 0,
  visible,
  onClose,
  onDownload,
}: {
  photos: Photo[];
  index?: number;
  visible: boolean;
  onClose: () => void;
  onDownload?: (photo: Photo) => void;
}) {
  const [current, setCurrent] = useState(index);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({x: 0, y: 0});
  const [failed, setFailed] = useState(false);
  const drag = useRef<{x: number; y: number; ox: number; oy: number; moved: boolean} | null>(null);
  const photo = photos[current];
  const many = photos.length > 1;

  useEffect(() => {
    if (visible) setCurrent(clamp(index, 0, Math.max(0, photos.length - 1)));
  }, [visible, index, photos.length]);

  // A new photo starts unzoomed.
  useEffect(() => {
    setZoom(1);
    setOffset({x: 0, y: 0});
    setFailed(false);
  }, [current]);

  const go = useCallback(
    (step: number) => setCurrent(c => (photos.length ? (c + step + photos.length) % photos.length : 0)),
    [photos.length],
  );

  const zoomTo = useCallback((next: number) => {
    const z = clamp(next, MIN, MAX);
    setZoom(z);
    if (z === 1) setOffset({x: 0, y: 0});
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && many) go(1);
      else if (e.key === 'ArrowLeft' && many) go(-1);
      else if (e.key === '+' || e.key === '=') zoomTo(zoom * 1.5);
      else if (e.key === '-') zoomTo(zoom / 1.5);
      else if (e.key === '0') zoomTo(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, many, go, zoom, zoomTo, onClose]);

  if (!visible || !photo) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, moved: false};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (zoom > 1) setOffset({x: d.ox + dx, y: d.oy + dy});
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    // Unzoomed: a swipe changes photo, a plain click on the dark area closes.
    if (zoom === 1 && many && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    else if (!d.moved && e.target === e.currentTarget) onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <div
          style={stage}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={e => zoomTo(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
          onDoubleClick={() => zoomTo(zoom > 1 ? 1 : 2.5)}>
          {failed ? (
            <Text color="white">{photo.title ?? ''} ✕</Text>
          ) : (
            <img
              key={`${current}-${photo.uri}`}
              src={photo.uri}
              alt={photo.title ?? ''}
              draggable={false}
              onError={() => setFailed(true)}
              style={{
                ...image,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? (drag.current ? 'grabbing' : 'grab') : 'zoom-in',
                transition: drag.current ? 'none' : 'transform 120ms ease-out',
              }}
            />
          )}
        </div>

        <View style={styles.top}>
          <IconButton icon="close" label="Close" variant="plain" color="white" onPress={onClose} />
          <View style={styles.title}>
            {photo.title ? (
              <Text variant="bodyLg" color="white" numberOfLines={1}>
                {photo.title}
              </Text>
            ) : null}
            {many ? (
              <Text variant="caption" color="white">
                {current + 1} / {photos.length}
              </Text>
            ) : null}
          </View>
          <IconButton
            icon="magnify-minus-outline"
            label="Zoom out"
            variant="plain"
            color="white"
            onPress={() => zoomTo(zoom / 1.5)}
          />
          <IconButton
            icon="magnify-plus-outline"
            label="Zoom in"
            variant="plain"
            color="white"
            onPress={() => zoomTo(zoom * 1.5)}
          />
          {onDownload ? (
            <IconButton
              icon="download"
              label="Download"
              variant="plain"
              color="white"
              onPress={() => onDownload(photo)}
            />
          ) : null}
        </View>

        {many ? (
          <>
            <View style={[styles.side, styles.left]}>
              <IconButton
                icon="chevron-left"
                label="Previous"
                variant="plain"
                size={48}
                color="white"
                onPress={() => go(-1)}
              />
            </View>
            <View style={[styles.side, styles.right]}>
              <IconButton
                icon="chevron-right"
                label="Next"
                variant="plain"
                size={48}
                color="white"
                onPress={() => go(1)}
              />
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const stage: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  touchAction: 'none',
  userSelect: 'none',
};

const image: React.CSSProperties = {
  maxWidth: 'calc(100vw - 144px)',
  maxHeight: 'calc(100vh - 128px)',
  objectFit: 'contain',
  transformOrigin: 'center center',
};

const styles = StyleSheet.create({
  // A photo viewer is always dark, whatever the theme.
  backdrop: {flex: 1, backgroundColor: 'black'},
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  title: {flex: 1, minWidth: 0},
  side: {position: 'absolute', top: '50%', marginTop: -24},
  left: {left: 12},
  right: {right: 12},
});
