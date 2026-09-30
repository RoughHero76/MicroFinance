// Bottom sheets are portals (@gorhom/bottom-sheet) in the app's own window,
// so the toast stays above them (unlike React Native's Modal).
//
//   const sheet = useSheet();
//   <Button onPress={sheet.open} />
//   <BottomSheet ref={sheet.ref} title="Record payment">…</BottomSheet>

import React, {forwardRef, useCallback, useImperativeHandle, useRef} from 'react';
import {View} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, useTheme} from '@/theme';
import {IconButton} from './IconButton';
import {Text} from './Text';

export interface SheetHandle {
  open: () => void;
  close: () => void;
}

export interface BottomSheetProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose?: () => void;
  /** Footer actions, right-aligned (U-03). */
  footer?: React.ReactNode;
  /** Let the content decide the height (default) or use fixed snap points. */
  snapPoints?: (string | number)[];
  dismissible?: boolean;
}

export const BottomSheet = forwardRef<SheetHandle, BottomSheetProps>(function BottomSheet(
  {title, subtitle, children, onClose, footer, snapPoints, dismissible = true},
  ref,
) {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const modal = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    open: () => modal.current?.present(),
    close: () => modal.current?.dismiss(),
  }));

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissible ? 'close' : 'none'}
      />
    ),
    [dismissible],
  );

  return (
    <BottomSheetModal
      ref={modal}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose={dismissible}
      onDismiss={onClose}
      backdropComponent={backdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{backgroundColor: t.colors.surface}}
      handleIndicatorStyle={{backgroundColor: t.colors.border, width: 40}}>
      <BottomSheetScrollView
        contentContainerStyle={[s.content, {paddingBottom: insets.bottom + 16}]}
        keyboardShouldPersistTaps="handled">
        {title ? (
          <View style={s.head}>
            <View style={s.titles}>
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="small" color="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {dismissible ? (
              <IconButton icon="close" label="Close" variant="plain" onPress={() => modal.current?.dismiss()} />
            ) : null}
          </View>
        ) : null}
        {children}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

export function useSheet() {
  const ref = useRef<SheetHandle>(null);
  const open = useCallback(() => ref.current?.open(), []);
  const close = useCallback(() => ref.current?.close(), []);
  return {ref, open, close};
}

const useStyles = makeStyles(t => ({
  content: {paddingHorizontal: t.space.lg, paddingTop: t.space.xs},
  head: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: t.space.md},
  titles: {flex: 1, gap: 2},
  footer: {flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.sm, marginTop: t.space.lg, flexWrap: 'wrap'},
}));
