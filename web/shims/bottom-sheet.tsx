// @gorhom/bottom-sheet on the web. Only what ui/Sheet.tsx and TextField use:
// a modal that is a bottom sheet on a narrow screen and a centred dialog on
// a wide one, drawn in its own layer above everything (the toast host stays
// above it). Sheets opened from sheets stack in the order they were opened.

import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ScrollView, StyleSheet, TextInput, View, type StyleProp, type ViewStyle} from 'react-native';

export const BottomSheetModalProvider = ({children}: {children: ReactNode}) => <>{children}</>;

export type BottomSheetBackdropProps = Record<string, unknown>;
export const BottomSheetBackdrop = () => null;
export const useBottomSheetSpringConfigs = (config: Record<string, unknown>) => config;

export const BottomSheetTextInput = TextInput;

export const BottomSheetScrollView = forwardRef<ScrollView, React.ComponentProps<typeof ScrollView>>(
  function BottomSheetScrollView({style, ...rest}, ref) {
    return <ScrollView ref={ref} {...rest} style={[{flexShrink: 1, minHeight: 0}, style]} />;
  },
);

export interface BottomSheetModalProps {
  children?: ReactNode;
  onDismiss?: () => void;
  enablePanDownToClose?: boolean;
  backgroundStyle?: StyleProp<ViewStyle>;
  handleIndicatorStyle?: StyleProp<ViewStyle>;
  // Accepted and ignored: they only matter on a phone.
  snapPoints?: unknown;
  enableDynamicSizing?: boolean;
  backdropComponent?: unknown;
  animationConfigs?: unknown;
  stackBehavior?: string;
  keyboardBehavior?: string;
  keyboardBlurBehavior?: string;
  android_keyboardInputMode?: string;
}

export interface BottomSheetModal {
  present: () => void;
  dismiss: () => void;
}

const WIDE = 720;
let layer = 1000;

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= WIDE);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= WIDE);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return wide;
}

const CSS = `
@keyframes sheetFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes sheetUp { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .sheet-anim { animation: none !important } }
`;

export const BottomSheetModal = forwardRef<BottomSheetModal, BottomSheetModalProps>(function BottomSheetModal(
  {children, onDismiss, enablePanDownToClose = true, backgroundStyle, handleIndicatorStyle},
  ref,
) {
  const [open, setOpen] = useState(false);
  const [z, setZ] = useState(0);
  const wide = useIsWide();
  const panel = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const present = useCallback(() => {
    if (openRef.current) return;
    openRef.current = true;
    setZ(++layer);
    setOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    dismissRef.current?.();
  }, []);

  useImperativeHandle(ref, () => ({present, dismiss}), [present, dismiss]);

  // Esc closes the top sheet; focus moves into the sheet when it opens.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && enablePanDownToClose && z === layer) dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, enablePanDownToClose, dismiss, z]);

  if (!open) return null;

  const shape: React.CSSProperties = wide
    ? {width: 'min(560px, 92vw)', maxHeight: '88vh', borderRadius: 20}
    : {width: '100%', maxHeight: '92vh', borderRadius: '24px 24px 0 0'};

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: z,
        display: 'flex',
        alignItems: wide ? 'center' : 'flex-end',
        justifyContent: 'center',
      }}>
      <style>{CSS}</style>
      <div
        className="sheet-anim"
        onClick={() => enablePanDownToClose && dismiss()}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8, 12, 20, 0.5)',
          animation: 'sheetFade 140ms ease-out',
        }}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="sheet-anim"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          animation: 'sheetUp 180ms ease-out',
          ...shape,
        }}>
        <View style={[styles.fill, backgroundStyle, {borderRadius: undefined}]}>
          {/* The dialog has no drag handle; keep the room it takes on a sheet. */}
          {wide ? <View style={styles.dialogTop} /> : <View style={[styles.handle, handleIndicatorStyle]} />}
          {children}
        </View>
      </div>
    </div>,
    document.body,
  );
});

const styles = StyleSheet.create({
  fill: {flexShrink: 1, minHeight: 0, flexGrow: 0},
  dialogTop: {height: 16},
  handle: {alignSelf: 'center', marginTop: 8, marginBottom: 4, borderRadius: 2},
});
