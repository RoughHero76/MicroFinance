// Mounted once inside the signed-in app. Registers the crop, webcam and PIN
// dialogs with the code that asks for them (lib/image.web.ts,
// lib/pinPrompt.ts), and shows whichever one is wanted.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {registerPinPrompt} from '@/lib/pinPrompt';
import {isValidPin, PIN_LENGTH} from '@/lib/sealedSession';
import {toast} from '@/ui/Toast';
import {BottomSheet, Button, TextField, useSheet} from '@/ui';
import {CropDialog} from './CropDialog';
import {registerImageHost, type ImageKind} from './imageHost';
import {WebcamDialog} from './WebcamDialog';

type CropJob = {file: Blob; kind: ImageKind; resolve: (blob: Blob | null) => void};
type WebcamJob = {resolve: (file: File | null) => void; reject: (error: Error) => void};

export function WebHosts() {
  const [crop, setCrop] = useState<CropJob | null>(null);
  const [webcam, setWebcam] = useState<WebcamJob | null>(null);

  useEffect(() => {
    registerImageHost({
      crop: (file, kind) => new Promise(resolve => setCrop({file, kind, resolve})),
      webcam: () => new Promise((resolve, reject) => setWebcam({resolve, reject})),
    });
    return () => registerImageHost(null);
  }, []);

  const finishCrop = useCallback(
    (blob: Blob | null) => {
      crop?.resolve(blob);
      setCrop(null);
    },
    [crop],
  );
  const finishWebcam = useCallback(
    (file: File | null) => {
      webcam?.resolve(file);
      setWebcam(null);
    },
    [webcam],
  );
  const webcamFailed = useCallback(() => {
    webcam?.reject(new Error('camera'));
    setWebcam(null);
  }, [webcam]);

  return (
    <>
      {crop ? <CropDialog file={crop.file} kind={crop.kind} onDone={finishCrop} /> : null}
      {webcam ? <WebcamDialog onDone={finishWebcam} onError={webcamFailed} /> : null}
      <PinSetup />
    </>
  );
}

/** "Choose a PIN" for turning on PIN unlock (Security). */
function PinSetup() {
  const {t} = useTranslation();
  const sheet = useSheet();
  const resolver = useRef<((pin: string | null) => void) | null>(null);
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback((value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  useEffect(() => {
    registerPinPrompt(
      () =>
        new Promise(resolve => {
          resolver.current = resolve;
          setPin('');
          setAgain('');
          setError(null);
          sheet.open();
        }),
    );
    return () => registerPinPrompt(null);
  }, [sheet]);

  const save = () => {
    if (!isValidPin(pin)) return setError(t('web.pinLength', {count: PIN_LENGTH}));
    if (pin !== again) return setError(t('web.pinMismatch'));
    finish(pin);
    sheet.close();
    toast.success(t('web.pinOn'));
  };

  const digits = (value: string) => value.replace(/\D/g, '').slice(0, PIN_LENGTH);

  return (
    <BottomSheet
      ref={sheet.ref}
      title={t('web.pinTitle')}
      subtitle={t('web.pinHint', {brand: brand.name, count: PIN_LENGTH})}
      onClose={() => finish(null)}
      footer={
        <>
          <Button title={t('common.cancel')} variant="text" onPress={sheet.close} />
          <Button title={t('common.save')} onPress={save} />
        </>
      }>
      <View style={{gap: 12}}>
        <TextField
          label={t('web.pinNew')}
          value={pin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={PIN_LENGTH}
          onChangeText={v => {
            setPin(digits(v));
            setError(null);
          }}
        />
        <TextField
          label={t('web.pinConfirm')}
          value={again}
          error={error}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={PIN_LENGTH}
          onChangeText={v => {
            setAgain(digits(v));
            setError(null);
          }}
          onSubmitEditing={save}
        />
      </View>
    </BottomSheet>
  );
}
