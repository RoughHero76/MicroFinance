import React from 'react';
import { Pressable, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { makeStyles } from '@/theme';
import { Text } from './Text';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ onPress, onLongPress, padded = true, style, children, accessibilityLabel, ...rest }: CardProps) {
  const s = useStyles();
  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [s.card, padded && s.padded, pressed && s.pressed, style]}
        {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[s.card, padded && s.padded, style]} {...rest}>
      {children}
    </View>
  );
}

/** A titled group of content on a screen ("Loans (2)", "Payments"). */
export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  return (
    <View style={[s.section, style]}>
      {title || action ? (
        <View style={s.sectionHead}>
          {title ? (
            <Text variant="overline" color="muted" style={s.sectionTitle}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const s = useStyles();
  return <View style={[s.divider, { marginLeft: inset }]} />;
}

const useStyles = makeStyles(t => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  padded: { padding: t.space.md },
  pressed: { opacity: 0.9 },
  section: { marginBottom: t.space.lg },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.space.sm,
    minHeight: 24,
  },
  sectionTitle: { flexShrink: 1 },
  divider: { height: 1, backgroundColor: t.colors.border },
}));
