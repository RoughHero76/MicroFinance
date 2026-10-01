// Screen scaffolding. U-02: tab roots get a big title and no back button;
// every other screen gets back + title + at most one action (⋯).
// U-03: the main action floats bottom-right (Fab), never a full-width bar.

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, statusBarStyle, useTheme, withAlpha} from '@/theme';
import {BrandLogo} from './BrandLogo';
import {Icon} from './Icon';
import {IconButton} from './IconButton';
import {PressableScale} from './PressableScale';
import {Skeleton} from './States';
import {useTransitionDone} from './useTransitionDone';
import {Text} from './Text';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** Tab roots: large title, no back button. */
  large?: boolean;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Brand-colour band behind the header (customer profile). */
  band?: boolean;
  titleAccessory?: React.ReactNode;
  /** Home screens: the brand logo in place of the title (mock A1/E1). */
  logo?: boolean;
}

export function Header({title, subtitle, large, back = !large, onBack, right, band, titleAccessory, logo}: HeaderProps) {
  const t = useTheme();
  const s = useStyles();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const canBack = back && (onBack || navigation.canGoBack());
  return (
    <View style={[s.header, large && s.headerClear, band && s.band, {paddingTop: insets.top + (large ? 12 : 4)}]}>
      {band ? <BandGradient /> : null}
      <View style={s.headerRow}>
        {canBack ? (
          <IconButton
            icon="arrow-left"
            label="Back"
            variant="plain"
            color={band ? t.colors.onPrimary : undefined}
            onPress={onBack ?? (() => navigation.goBack())}
            style={s.back}
          />
        ) : null}
        <View style={s.titles}>
          {logo ? <BrandLogo width={110} height={34} style={s.logo} /> : null}
          {title && !logo ? (
            <View style={s.titleLine}>
              <Text
                variant={large ? 'h1' : 'title'}
                color={band ? 'onPrimary' : 'text'}
                numberOfLines={1}
                style={s.titleText}
                accessibilityRole="header">
                {title}
              </Text>
              {titleAccessory}
            </View>
          ) : null}
          {subtitle ? (
            <Text variant="small" color={band ? 'onPrimary' : 'muted'} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={s.right}>{right}</View> : null}
      </View>
    </View>
  );
}

// Horizontal, so the header band and its extension in the content
// (BandExtension) join without a visible seam.
function BandGradient({style}: {style?: StyleProp<ViewStyle>}) {
  const t = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[t.colors.primary, t.colors.primary2]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}

/**
 * Continues a `band` header into the top of the content, so the first card
 * can overlap it (mock A3). Put it first in a padded, scrolling Screen and
 * give the next card a negative top margin.
 */
export function BandExtension({height = 64}: {height?: number}) {
  const s = useStyles();
  return (
    <View style={[s.bandExtension, {height}]} pointerEvents="none">
      <BandGradient />
    </View>
  );
}

export interface ScreenProps {
  header?: HeaderProps | false;
  /** Scrolls the content (forms and detail screens). Lists pass false and use a FlatList. */
  scroll?: boolean;
  padded?: boolean;
  children: React.ReactNode;
  /** Floating action(s), bottom-right. */
  fab?: React.ReactNode;
  banner?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  keyboard?: boolean;
  /**
   * Heavy detail screens: show placeholders until the push animation ends,
   * then build the content, so the slide-in never stutters (W7).
   */
  defer?: boolean;
}

export function Screen({
  header,
  scroll,
  padded = true,
  children,
  fab,
  banner,
  contentStyle,
  refreshControl,
  keyboard,
  defer,
}: ScreenProps) {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const ready = useTransitionDone(!defer);
  const content = ready ? children : <DeferredPlaceholder />;
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && s.padded, {paddingBottom: (fab ? 96 : 24) + insets.bottom}, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}>
      {content}
    </ScrollView>
  ) : (
    <View style={[s.flex, padded && s.padded, contentStyle]}>{content}</View>
  );
  // A quick fade as the content arrives, instead of popping in.
  const body = (
    <Animated.View key={ready ? 'ready' : 'wait'} entering={FadeIn.duration(180)} style={s.flex}>
      {inner}
    </Animated.View>
  );
  const glow = header && header.large && !header.band;

  return (
    <View style={s.screen}>
      <StatusBar
        barStyle={header && header.band ? 'light-content' : statusBarStyle(t)}
        backgroundColor="transparent"
        translucent
      />
      {glow ? (
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(t.colors.primary, t.dark ? 0.16 : 0.1), withAlpha(t.colors.primary, 0)]}
          style={[s.glow, {height: 220 + insets.top}]}
        />
      ) : null}
      {header ? <Header {...header} /> : <View style={{height: insets.top}} />}
      {banner}
      {keyboard ? (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
          {fab ? <View style={[s.fab, {bottom: 16 + insets.bottom}]}>{fab}</View> : null}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {fab ? <View style={[s.fab, {bottom: 16 + insets.bottom}]}>{fab}</View> : null}
        </>
      )}
    </View>
  );
}

/** Stand-in cards while a deferred screen waits for its push animation. */
function DeferredPlaceholder() {
  const s = useStyles();
  return (
    <View style={s.placeholder} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Skeleton height={120} radius={20} />
      <Skeleton width="55%" height={16} />
      <Skeleton height={72} radius={16} />
      <Skeleton height={72} radius={16} />
    </View>
  );
}

/** Compact floating action: a small rounded button, not a full-width bar. */
export function Fab({
  label,
  icon,
  onPress,
  disabled,
  loading,
}: {
  label?: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const t = useTheme();
  const s = useStyles();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.fabButton, !label && s.fabRound, (disabled || loading) && s.fabDisabled]}>
      {loading ? (
        <ActivityIndicator size="small" color={t.colors.onPrimary} />
      ) : (
        <Icon name={icon} size={20} color="onPrimary" />
      )}
      {label ? (
        <Text variant="label" weight="semibold" color="onPrimary" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );
}

/** Actions that sit side by side at the right edge (Reject · Approve). */
export function ActionRow({children, style}: {children: React.ReactNode; style?: StyleProp<ViewStyle>}) {
  const s = useStyles();
  return <View style={[s.actionRow, style]}>{children}</View>;
}

const useStyles = makeStyles(t => ({
  screen: {flex: 1, backgroundColor: t.colors.bg},
  flex: {flex: 1},
  padded: {padding: t.space.lg},
  header: {backgroundColor: t.colors.bg, paddingHorizontal: t.space.sm, paddingBottom: t.space.sm},
  headerClear: {backgroundColor: 'transparent'},
  glow: {position: 'absolute', top: 0, left: 0, right: 0},
  placeholder: {gap: t.space.md},
  band: {backgroundColor: t.colors.primary},
  bandExtension: {marginTop: -t.space.lg, marginHorizontal: -t.space.lg, marginBottom: 0},
  headerRow: {flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: t.space.sm},
  back: {marginRight: t.space.xs},
  titles: {flex: 1, minWidth: 0},
  titleLine: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  titleText: {flexShrink: 1},
  logo: {alignSelf: 'flex-start'},
  right: {flexDirection: 'row', alignItems: 'center', gap: t.space.xs, marginLeft: t.space.sm},
  fab: {position: 'absolute', right: 16, flexDirection: 'row', gap: t.space.sm},
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    height: 48,
    paddingHorizontal: t.space.lg + 2,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primary,
    ...t.shadow.primary,
  },
  // The mock's FAB is a rounded square (18 radius), not a circle.
  fabRound: {width: 52, height: 52, paddingHorizontal: 0, justifyContent: 'center', borderRadius: 18},
  fabDisabled: {opacity: 0.5},
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: t.space.sm,
    flexWrap: 'wrap',
  },
}));

export function MenuIcon() {
  return <Icon name="dots-vertical" size={22} />;
}
