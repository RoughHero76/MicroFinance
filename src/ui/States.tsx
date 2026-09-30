// S6: every list has loading (placeholder rows), empty (with one next step)
// and error (plain words and Retry) states. S7: the offline banner.

import React, {useEffect, useRef} from 'react';
import {Animated, View, type StyleProp, type ViewStyle} from 'react-native';
import {useNetInfo} from '@react-native-community/netinfo';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/api';
import {formatTime} from '@/lib/format';
import {makeStyles} from '@/theme';
import {Button} from './Button';
import {Icon} from './Icon';
import {Text} from './Text';

export function EmptyState({
  icon = 'inbox-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  return (
    <View style={[s.state, style]}>
      <View style={s.iconCircle}>
        <Icon name={icon} size={28} color="primary" />
      </View>
      <Text variant="title" align="center">
        {title}
      </Text>
      {message ? (
        <Text color="muted" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={s.action} /> : null}
    </View>
  );
}

export function ErrorState({
  error,
  what,
  onRetry,
  style,
}: {
  error?: unknown;
  /** What failed to load, e.g. "loans". */
  what?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  const {t} = useTranslation();
  return (
    <View style={[s.state, style]}>
      <View style={[s.iconCircle, s.errorCircle]}>
        <Icon name="cloud-alert" size={28} color="danger" />
      </View>
      <Text variant="title" align="center">
        {what ? t('errors.loadFailed', {what}) : t('errors.unknown')}
      </Text>
      {error ? (
        <Text color="muted" align="center">
          {errorMessage(error, t)}
        </Text>
      ) : null}
      {onRetry ? (
        <Button title={t('common.retry')} onPress={onRetry} variant="secondary" icon="refresh" style={s.action} />
      ) : null}
    </View>
  );
}

/** A pulsing placeholder block. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.5, duration: 700, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[s.skeleton, {width, height, borderRadius: radius, opacity}, style]} />;
}

/** Placeholder list rows shown while a list loads (instead of a spinner). */
export function SkeletonRows({count = 6, avatar = true}: {count?: number; avatar?: boolean}) {
  const s = useStyles();
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({length: count}, (_, i) => (
        <View key={i} style={s.skelRow}>
          {avatar ? <Skeleton width={40} height={40} radius={20} /> : null}
          <View style={s.skelBody}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
          <Skeleton width={56} height={14} />
        </View>
      ))}
    </View>
  );
}

/** "You're offline · showing list from 9:12" (U-10). */
export function OfflineBanner({savedAt}: {savedAt?: number}) {
  const s = useStyles();
  const {t} = useTranslation();
  const net = useNetInfo();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  if (!offline) {
    return null;
  }
  return (
    <View style={s.banner} accessibilityRole="alert">
      <Icon name="wifi-off" size={16} color="warning" />
      <Text variant="small" weight="medium" style={s.bannerText} numberOfLines={2}>
        {savedAt ? t('states.offlineBanner', {time: formatTime(savedAt)}) : t('states.offlineBannerNoTime')}
      </Text>
    </View>
  );
}

export function useIsOffline(): boolean {
  const net = useNetInfo();
  return net.isConnected === false || net.isInternetReachable === false;
}

const useStyles = makeStyles(t => ({
  state: {alignItems: 'center', justifyContent: 'center', padding: t.space.xl, gap: t.space.sm, flexGrow: 1},
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.space.sm,
  },
  errorCircle: {backgroundColor: t.colors.dangerSoft},
  action: {marginTop: t.space.md, alignSelf: 'center'},
  skeleton: {backgroundColor: t.colors.skeleton},
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  skelBody: {flex: 1, gap: t.space.sm},
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
    backgroundColor: t.colors.warningSoft,
  },
  bannerText: {flex: 1, color: t.colors.text},
}));
