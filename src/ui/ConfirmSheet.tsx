// Confirmations for money and destructive actions (U-08): the amount and
// name are shown, optional required text (a reason, or the loan number typed
// to confirm), and the button is disabled while the request runs.

import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {makeStyles} from '@/theme';
import {Button} from './Button';
import {BottomSheet, type SheetHandle} from './Sheet';
import {Text} from './Text';
import {TextField} from './TextField';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Extra content above the buttons (a summary, warnings). */
  body?: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Ask for text before confirming (e.g. a rejection reason). */
  input?: {label: string; placeholder?: string; required?: boolean; multiline?: boolean};
  /** The user must type exactly this to enable the button (force delete). */
  typeToConfirm?: string;
  onConfirm: (input: string) => Promise<unknown> | void;
}

export interface ConfirmHandle {
  ask: (options: ConfirmOptions) => void;
  close: () => void;
}

export const ConfirmSheet = forwardRef<ConfirmHandle>(function ConfirmSheet(_, ref) {
  const s = useStyles();
  const {t} = useTranslation();
  const sheet = useRef<SheetHandle>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    ask: next => {
      setOptions(next);
      setText('');
      setBusy(false);
      sheet.current?.open();
    },
    close: () => sheet.current?.close(),
  }));

  const needsText = !!options?.input?.required && !text.trim();
  const typedWrong = !!options?.typeToConfirm && text.trim() !== options.typeToConfirm;

  const confirm = async () => {
    if (!options) {
      return;
    }
    setBusy(true);
    try {
      await options.onConfirm(text.trim());
      sheet.current?.close();
    } catch {
      // The caller shows the error; keep the sheet open to retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      ref={sheet}
      title={options?.title}
      dismissible={!busy}
      footer={
        options ? (
          <>
            <Button title={t('common.cancel')} variant="text" onPress={() => sheet.current?.close()} disabled={busy} />
            <Button
              title={options.confirmLabel}
              variant={options.destructive ? 'danger' : 'primary'}
              onPress={confirm}
              loading={busy}
              disabled={needsText || typedWrong}
            />
          </>
        ) : null
      }>
      {options?.message ? <Text style={s.message}>{options.message}</Text> : null}
      {options?.body ? <View style={s.body}>{options.body}</View> : null}
      {options?.input ? (
        <TextField
          label={options.input.label}
          placeholder={options.input.placeholder}
          required={options.input.required}
          value={text}
          onChangeText={setText}
          multiline={options.input.multiline}
        />
      ) : null}
      {options?.typeToConfirm ? (
        <TextField
          label={t('ui.typeToConfirm', {value: options.typeToConfirm})}
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          keyboardType="default"
        />
      ) : null}
    </BottomSheet>
  );
});

export function useConfirm() {
  const ref = useRef<ConfirmHandle>(null);
  return {ref, ask: (options: ConfirmOptions) => ref.current?.ask(options)};
}

const useStyles = makeStyles(t => ({
  message: {marginBottom: t.space.md},
  body: {marginBottom: t.space.md},
}));
