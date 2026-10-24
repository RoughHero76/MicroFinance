// Bottom sheets are portals (@gorhom/bottom-sheet) in the app's own window,
// so the toast stays above them (unlike React Native's Modal).
//
//   const sheet = useSheet();
//   <Button onPress={sheet.open} />
//   <BottomSheet ref={sheet.ref} title="Record payment">…</BottomSheet>

import React, {forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef} from 'react';
import {View} from 'react-native';
import {
  BottomSheetBackdrop,
  useBottomSheetSpringConfigs,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {NavigationContext} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, useTheme} from '@/theme';
import {IconButton} from './IconButton';
import {InSheet} from './sheetContext';
import {Text} from './Text';

// Every sheet that's open now, so all of them can be closed before the
// screens under them go away (sign-out, app lock). A sheet whose screen
// unmounts while it's open can stay stuck on top of the next screen.
const openSheets = new Map<number, {dismiss: () => void; closed: Promise<void>; settle: () => void}>();
let nextSheetId = 0;

function trackOpen(id: number, dismiss: () => void) {
  if (openSheets.has(id)) return;
  let settle = () => {};
  const closed = new Promise<void>(resolve => (settle = resolve));
  openSheets.set(id, {dismiss, closed, settle});
}

function trackClosed(id: number) {
  openSheets.get(id)?.settle();
  openSheets.delete(id);
}

/** Closes every open sheet and waits (at most timeoutMs) for them to go. */
export function closeAllSheets(timeoutMs = 600): Promise<void> {
  if (!openSheets.size) return Promise.resolve();
  const closing = [...openSheets.values()];
  closing.forEach(sheet => sheet.dismiss());
  return Promise.race([
    Promise.all(closing.map(sheet => sheet.closed)).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
  ]);
}

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
  const navigation = useContext(NavigationContext);
  const id = useRef(0);
  if (!id.current) id.current = ++nextSheetId;

  useImperativeHandle(ref, () => ({
    // A tap that lands while the screen is already going back must not open
    // a sheet: it would outlive its screen and block every touch.
    open: () => {
      if (navigation && !navigation.isFocused()) return;
      trackOpen(id.current, () => modal.current?.dismiss());
      modal.current?.present();
    },
    close: () => modal.current?.dismiss(),
  }));

  // Close with the screen: when it loses focus (back, or another screen on
  // top) and when it unmounts mid-animation.
  useEffect(() => {
    const sheet = modal.current;
    const off = navigation?.addListener('blur', () => modal.current?.dismiss());
    const sheetId = id.current;
    return () => {
      off?.();
      sheet?.dismiss();
      trackClosed(sheetId);
    };
  }, [navigation]);

  const handleDismiss = useCallback(() => {
    trackClosed(id.current);
    onClose?.();
  }, [onClose]);

  // W7: sheets settle with a soft spring instead of a linear slide.
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 80,
    stiffness: 500,
    mass: 1,
    overshootClamping: true,
  });

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
      onDismiss={handleDismiss}
      backdropComponent={backdrop}
      animationConfigs={animationConfigs}
      // A sheet opened from a sheet (a picker in the payment sheet) goes on
      // top. The default ('replace') slid the first one away and back when the
      // picker closed, which looked like it closed and reopened.
      stackBehavior="push"
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={[s.background, {backgroundColor: t.colors.surface}]}
      handleIndicatorStyle={[s.handle, {backgroundColor: t.colors.border}]}>
      <InSheet.Provider value={true}>
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
      </InSheet.Provider>
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
  background: {borderTopLeftRadius: 24, borderTopRightRadius: 24},
  handle: {width: 36, height: 4},
  content: {paddingHorizontal: t.space.lg, paddingTop: t.space.xs},
  head: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: t.space.md},
  titles: {flex: 1, gap: 2},
  footer: {flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.sm, marginTop: t.space.lg, flexWrap: 'wrap'},
}));
