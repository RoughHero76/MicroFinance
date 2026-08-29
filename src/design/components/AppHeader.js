import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, type } from '../tokens';
import Icon from '../Icon';
import { usePressScale } from '../motion';

/**
 * AppHeader
 * ---------
 * In-content header for screens rendered with the native header hidden
 * (headerShown: false). Back button is optional; pass `right` for trailing
 * actions and `subtitle` under the title.
 *
 *   <AppHeader title="Customer" right={<Button iconOnly icon="pencil" .../>} />
 */
const AppHeader = ({
  title,
  subtitle,
  right,
  left,
  onBack,
  dark = false,
  noBack = false,
  style,
}) => {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack ? navigation.canGoBack() : false;
  const showBack = !noBack && canGoBack;

  const bg = dark ? colors.dark : colors.surface;
  const fg = dark ? colors.onDark : colors.ink;
  const muted = dark ? colors.onDarkMuted : colors.inkMuted;

  const goBack = () => (onBack ? onBack() : navigation.goBack());
  const [backPress, backHandlers] = usePressScale(0.9);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: bg, borderBottomColor: dark ? colors.darkAlt : colors.border },
        style,
      ]}
    >
      {showBack || left ? (
        <View style={styles.leading}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={goBack}
              {...backHandlers}
              style={[styles.back, backPress]}
            >
              <Icon name="chevron-left" size={22} color={fg} />
            </Pressable>
          ) : (
            left
          )}
        </View>
      ) : (
        <View style={styles.leading} />
      )}

      <View style={styles.titleWrap}>
        {title ? (
          <Text numberOfLines={1} style={[type.h2, { color: fg }]}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text numberOfLines={1} style={[type.caption, { color: muted, marginTop: 1 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? (
        <View style={styles.trailing}>{right}</View>
      ) : (
        <View style={styles.trailing} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  leading: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkFaint,
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 44,
  },
});

export default AppHeader;
