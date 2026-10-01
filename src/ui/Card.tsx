import React from 'react';
import {View, type StyleProp, type ViewProps, type ViewStyle} from 'react-native';
import {makeStyles, withAlpha} from '@/theme';
import {PressableScale} from './PressableScale';
import {Text} from './Text';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  /** Thin lines between the children (grouped rows, mock A20). */
  dividers?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({
  onPress,
  onLongPress,
  padded = true,
  dividers,
  style,
  children: rawChildren,
  accessibilityLabel,
  ...rest
}: CardProps) {
  const s = useStyles();
  const children = dividers ? withDividers(rawChildren) : rawChildren;
  if (onPress || onLongPress) {
    return (
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[s.card, padded && s.padded, dividers && s.clip, style]}
        {...rest}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={[s.card, padded && s.padded, dividers && s.clip, style]} {...rest}>
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

function withDividers(children: React.ReactNode) {
  const items = React.Children.toArray(children).filter(Boolean);
  return items.map((child, i) =>
    i === 0 ? (
      child
    ) : (
      <React.Fragment key={`d${i}`}>
        <Divider inset={16} />
        {child}
      </React.Fragment>
    ),
  );
}

export function Divider({inset = 0}: {inset?: number}) {
  const s = useStyles();
  return <View style={[s.divider, {marginLeft: inset}]} />;
}

const useStyles = makeStyles(t => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.dark ? t.colors.border : withAlpha(t.colors.border, 0.7),
    ...t.shadow.card,
  },
  padded: {padding: t.space.md},
  // Keeps row press highlights inside the rounded corners (Android keeps the shadow).
  clip: {overflow: 'hidden'},
  section: {marginBottom: t.space.lg},
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.space.sm,
    minHeight: 24,
  },
  sectionTitle: {flexShrink: 1},
  divider: {height: 1, backgroundColor: t.colors.border},
}));
