// Screen scaffolding. U-02: tab roots get a big title and no back button;
// every other screen gets back + title + at most one action (⋯).
// U-03: the main action floats bottom-right (Fab), never a full-width bar.

import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {makeStyles, statusBarStyle, useTheme} from '@/theme';
import {Icon} from './Icon';
import {IconButton} from './IconButton';
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
}

export function Header({title, subtitle, large, back = !large, onBack, right, band, titleAccessory}: HeaderProps) {
  const t = useTheme();
  const s = useStyles();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const canBack = back && (onBack || navigation.canGoBack());
  return (
    <View style={[s.header, band && s.band, {paddingTop: insets.top + (large ? 12 : 4)}]}>
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
          {title ? (
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
}: ScreenProps) {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && s.padded, {paddingBottom: (fab ? 96 : 24) + insets.bottom}, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}>
      {children}
    </ScrollView>
  ) : (
    <View style={[s.flex, padded && s.padded, contentStyle]}>{children}</View>
  );

  return (
    <View style={s.screen}>
      <StatusBar
        barStyle={header && header.band ? 'light-content' : statusBarStyle(t)}
        backgroundColor="transparent"
        translucent
      />
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
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({pressed}) => [
        s.fabButton,
        !label && s.fabRound,
        pressed && s.fabPressed,
        (disabled || loading) && s.fabDisabled,
      ]}>
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
    </Pressable>
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
  band: {backgroundColor: t.colors.primary},
  headerRow: {flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: t.space.sm},
  back: {marginRight: t.space.xs},
  titles: {flex: 1, minWidth: 0},
  titleLine: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  titleText: {flexShrink: 1},
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
    elevation: 4,
    shadowColor: t.colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
  },
  fabRound: {width: 52, height: 52, paddingHorizontal: 0, justifyContent: 'center'},
  fabPressed: {opacity: 0.9},
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
