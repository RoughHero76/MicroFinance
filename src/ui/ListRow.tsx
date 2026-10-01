// U-14: photo + at most 2–3 lines. Line 1: who and how much. Line 2: one
// identifying fact. Status in a pill.

import React from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import {makeStyles, useTheme} from '@/theme';
import {Icon} from './Icon';
import {Text} from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  left?: React.ReactNode;
  /** Top-right text, usually an amount. */
  value?: string | null;
  right?: React.ReactNode;
  badge?: React.ReactNode;
  chevron?: boolean;
  /** A standalone card in a list (mock A5/A13): rounded, bordered, soft shadow, spaced. */
  card?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const ListRow = React.memo(function ListRow({
  title,
  subtitle,
  meta,
  left,
  value,
  right,
  badge,
  chevron,
  card,
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
}: ListRowProps) {
  const t = useTheme();
  const s = useStyles();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      android_ripple={onPress || onLongPress ? {color: t.colors.primarySoft} : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, value, subtitle].filter(Boolean).join(', ')}
      style={({pressed}) => [s.row, card && s.card, pressed && s.pressed, style]}>
      {left}
      <View style={s.body}>
        <View style={s.line}>
          <Text variant="bodyLg" weight="bold" numberOfLines={1} style={s.title}>
            {title}
          </Text>
          {value ? (
            <Text variant="bodyLg" weight="bold" tabular numberOfLines={1}>
              {value}
            </Text>
          ) : null}
        </View>
        {subtitle || badge ? (
          <View style={s.line}>
            {subtitle ? (
              <Text variant="small" color="muted" numberOfLines={1} style={s.title}>
                {subtitle}
              </Text>
            ) : (
              <View style={s.title} />
            )}
            {badge}
          </View>
        ) : null}
        {meta ? (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={20} color="muted" /> : null}
    </Pressable>
  );
});

const useStyles = makeStyles(t => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.lg,
    minHeight: 64,
    backgroundColor: t.colors.surface,
  },
  // iOS has no ripple; Android shows both, which reads as one highlight.
  card: {
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: 10,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  pressed: {backgroundColor: t.colors.surface2},
  body: {flex: 1, gap: 3, minWidth: 0},
  line: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  title: {flex: 1, minWidth: 0},
}));
