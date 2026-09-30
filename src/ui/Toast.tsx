// One toast host for the whole app (style A, the floating pill). Screens call
// toast.success(...) and never render a toast themselves. Sheets are portals
// in the same window, so the pill always draws above them; the few real
// native Modals use AppModal, which mounts its own host.
//
// Timing: success/info 3 s, Undo 10 s, error 5 s, or until tapped with Retry.

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme';
import { Text } from './Text';

export type ToastKind = 'success' | 'error' | 'info' | 'progress';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message?: string;
  action?: ToastAction;
  duration?: number;
  /** 0–1 for upload progress toasts. */
  progress?: number;
  id?: string;
}

export interface ToastItem extends ToastOptions {
  key: number;
  kind: ToastKind;
  title: string;
}

type Listener = (item: ToastItem | null) => void;
const listeners = new Set<Listener>();
let current: ToastItem | null = null;
let seq = 0;

function emit(item: ToastItem | null) {
  current = item;
  listeners.forEach(l => l(item));
}

function show(kind: ToastKind, title: string, opts: ToastOptions = {}) {
  // Updating a progress toast keeps it in place instead of re-animating.
  if (opts.id && current?.id === opts.id) {
    emit({ ...current, ...opts, kind, title });
    return;
  }
  seq += 1;
  if (kind === 'success') haptics.success();
  if (kind === 'error') haptics.error();
  AccessibilityInfo.announceForAccessibility([title, opts.message].filter(Boolean).join('. '));
  emit({ key: seq, kind, title, ...opts });
}

export const toast = {
  success: (title: string, opts?: ToastOptions) => show('success', title, opts),
  error: (title: string, opts?: ToastOptions) => show('error', title, opts),
  info: (title: string, opts?: ToastOptions) => show('info', title, opts),
  progress: (id: string, title: string, progress: number) => show('progress', title, { id, progress, duration: 0 }),
  hide: (id?: string) => {
    if (!id || current?.id === id) emit(null);
  },
};

function durationOf(item: ToastItem): number {
  if (item.duration !== undefined) return item.duration;
  if (item.kind === 'progress') return 0;
  if (item.action && item.kind === 'error') return 0; // Retry waits for a tap
  if (item.action) return 10000; // Undo
  return item.kind === 'error' ? 5000 : 3000;
}

export function ToastHost() {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ToastItem | null>(current);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const listener: Listener = next => setItem(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!item) {
      Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    const ms = durationOf(item);
    if (ms > 0) timer.current = setTimeout(() => toast.hide(), ms);
    return () => clearTimeout(timer.current);
  }, [item, anim]);

  if (!item) return null;
  const dot = item.kind === 'success' ? t.colors.success : item.kind === 'error' ? t.colors.danger : t.colors.info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        s.wrap,
        { top: insets.top + 8, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}>
      <Pressable onPress={() => toast.hide()} style={s.pill} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View style={[s.dot, { backgroundColor: dot }]} />
        <View style={s.texts}>
          <Text variant="small" weight="semibold" color="onToast" numberOfLines={1}>
            {item.title}
            {item.kind === 'progress' && item.progress != null ? `  ${Math.round(item.progress * 100)}%` : ''}
          </Text>
          {item.message ? (
            <Text variant="caption" color="onToast" numberOfLines={2} style={s.message}>
              {item.message}
            </Text>
          ) : null}
        </View>
        {item.action ? (
          <Pressable
            onPress={() => {
              toast.hide();
              item.action?.onPress();
            }}
            hitSlop={10}
            accessibilityRole="button"
            style={s.action}>
            <Text variant="small" weight="bold" style={{ color: t.dark ? t.colors.primary : t.colors.primary2 }}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles(t => ({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9999, elevation: 9999 },
  pill: {
    maxWidth: '92%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.toast,
    elevation: 8,
    shadowColor: 'black',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  texts: { flexShrink: 1 },
  message: { opacity: 0.8 },
  action: { marginLeft: t.space.sm, paddingVertical: t.space.xs },
}));
