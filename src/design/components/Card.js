import React from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, radius, shadow } from '../tokens';
import { usePressScale } from '../motion';

/**
 * Card
 * ----
 * The surface primitive. Rounded, white, soft shadow. Pass `onPress` to make it
 * tappable (adds press feedback).
 *
 *   <Card>...</Card>
 *   <Card tone="accent">...</Card>
 *   <Card onPress={...}>...</Card>
 */
const Card = ({
  children,
  style,
  tone = 'surface',
  padded = true,
  onPress,
  elevation = 'card',
}) => {
  const [press, pressHandlers] = usePressScale(onPress ? 0.98 : 1);

  const bg =
    tone === 'accent'
      ? colors.accentSoft
      : tone === 'dark'
      ? colors.dark
      : tone === 'alt'
      ? colors.surfaceAlt
      : colors.surface;

  const inner = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bg,
          padding: padded ? spacing.lg : 0,
          ...shadow[elevation] || shadow.card,
        },
        press,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        {...pressHandlers}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default Card;
