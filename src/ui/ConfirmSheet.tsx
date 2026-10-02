// Confirmations for money and destructive actions (U-08): the amount and
// name are shown, optional required text (a reason, or the loan number typed
// to confirm), and the button is disabled while the request runs.
//
// Confirmations that ask for text open as a centred dialog in its own native
// window instead of a bottom sheet. On some phones (Galaxy S25) the sheet
// slid away as soon as the keyboard opened, even with the sheet library's
// own input, so the reason could never be typed.

import React, {forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {NavigationContext} from '@react-navigation/native';
import {makeStyles, useTheme} from '@/theme';
import {AppModal} from './AppModal';
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
  const theme = useTheme();
  const {t} = useTranslation();
  const sheet = useRef<SheetHandle>(null);
  const navigation = useContext(NavigationContext);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const asksText = !!options?.input || !!options?.typeToConfirm;

  const close = () => {
    setDialogOpen(false);
    sheet.current?.close();
  };

  useImperativeHandle(ref, () => ({
    ask: next => {
      setOptions(next);
      setText('');
      setBusy(false);
      if (next.input || next.typeToConfirm) {
        // Same rule as sheets: not while the screen is going away.
        if (navigation && !navigation.isFocused()) {
          return;
        }
        setDialogOpen(true);
      } else {
        sheet.current?.open();
      }
    },
    close,
  }));

  // The dialog closes with its screen, like a sheet.
  useEffect(() => navigation?.addListener('blur', () => setDialogOpen(false)), [navigation]);

  const needsText = !!options?.input?.required && !text.trim();
  const typedWrong = !!options?.typeToConfirm && text.trim() !== options.typeToConfirm;

  const confirm = async () => {
    if (!options) {
      return;
    }
    setBusy(true);
    try {
      await options.onConfirm(text.trim());
      close();
    } catch {
      // The caller shows the error; keep the sheet open to retry.
    } finally {
      setBusy(false);
    }
  };

  const footer = options ? (
    <>
      <Button title={t('common.cancel')} variant="text" onPress={close} disabled={busy} />
      <Button
        title={options.confirmLabel}
        variant={options.destructive ? 'danger' : 'primary'}
        onPress={confirm}
        loading={busy}
        disabled={needsText || typedWrong}
      />
    </>
  ) : null;

  const content = (
    <>
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
    </>
  );

  return (
    <>
      <BottomSheet
        ref={sheet}
        title={asksText ? undefined : options?.title}
        dismissible={!busy}
        footer={asksText ? null : footer}>
        {asksText ? null : content}
      </BottomSheet>
      {/* Not statusBarTranslucent: with it, Android doesn't shrink the
          window for the keyboard and the dialog would sit behind it. */}
      <AppModal
        visible={dialogOpen && asksText}
        transparent
        statusBarTranslucent={false}
        onRequestClose={() => !busy && close()}>
        <View style={[s.scrim, {backgroundColor: theme.colors.scrim}]}>
          <Pressable
            style={s.dismissArea}
            onPress={() => !busy && close()}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <View style={[s.dialog, {backgroundColor: theme.colors.surface}]}>
            {options?.title ? (
              <Text variant="title" accessibilityRole="header" style={s.title}>
                {options.title}
              </Text>
            ) : null}
            {content}
            <View style={s.footer}>{footer}</View>
          </View>
        </View>
      </AppModal>
    </>
  );
});

export function useConfirm() {
  const ref = useRef<ConfirmHandle>(null);
  return {ref, ask: (options: ConfirmOptions) => ref.current?.ask(options)};
}

const useStyles = makeStyles(t => ({
  message: {marginBottom: t.space.md},
  body: {marginBottom: t.space.md},
  scrim: {flex: 1, justifyContent: 'center', padding: t.space.lg},
  dismissArea: {...StyleSheet.absoluteFillObject},
  dialog: {borderRadius: 24, padding: t.space.lg, maxWidth: 480, width: '100%', alignSelf: 'center'},
  title: {marginBottom: t.space.md},
  footer: {flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.sm, marginTop: t.space.sm, flexWrap: 'wrap'},
}));
