// "Take a photo" on a computer: shows the webcam and saves one frame as a
// picture, which then goes to the cropper like any other pick.

import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useTheme} from '@/theme';

export function WebcamDialog({
  onDone,
  onError,
}: {
  onDone: (file: File | null) => void;
  onError: () => void;
}) {
  const {t} = useTranslation();
  const c = useTheme().colors;
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({video: {facingMode: 'user'}, audio: false})
      .then(s => {
        if (!alive) return s.getTracks().forEach(track => track.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().then(() => setReady(true));
        }
      })
      .catch(() => alive && onError());
    return () => {
      alive = false;
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, [onError]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const capture = () => {
    const v = video.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob(
      blob => onDone(blob ? new File([blob], `camera_${Date.now()}.jpg`, {type: 'image/jpeg'}) : null),
      'image/jpeg',
      0.92,
    );
  };

  return (
    <div style={{position: 'fixed', inset: 0, zIndex: 200000, display: 'grid', placeItems: 'center'}}>
      <div style={{position: 'absolute', inset: 0, background: c.scrim}} onClick={() => onDone(null)} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          background: c.surface,
          color: c.text,
          borderRadius: 20,
          padding: 20,
          width: 'min(560px, 94vw)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        }}>
        <div style={{fontWeight: 700, fontSize: 17, marginBottom: 12}}>{t('web.takePhoto')}</div>
        <video
          ref={video}
          playsInline
          muted
          style={{width: '100%', borderRadius: 12, background: c.surface2, transform: 'scaleX(-1)', display: 'block'}}
        />
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14}}>
          <button
            type="button"
            onClick={() => onDone(null)}
            style={{padding: '9px 16px', border: 0, background: 'transparent', color: c.muted, fontWeight: 600, cursor: 'pointer'}}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={capture}
            style={{padding: '9px 20px', border: 0, borderRadius: 10, background: c.primary, color: c.onPrimary, fontWeight: 700, cursor: 'pointer', opacity: ready ? 1 : 0.5}}>
            {t('web.capture')}
          </button>
        </div>
      </div>
    </div>
  );
}
