import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, type, shadow } from '../tokens';
import { usePressScale } from '../motion';
import Icon from '../Icon';
import Avatar from './Avatar';

/**
 * ListRow
 * -------
 * Reusable tappable row: leading avatar or icon, title + subtitle, right slot.
 * Used across customer/loan/employee lists for a consistent rhythm.
 *
 *   <ListRow
 *     avatar="Priya Sharma"
 *     title="Priya Sharma"
 *     subtitle="2 active loans"
 *     right={<Chip label="Active" tone="success" />}
 *     onPress={...}
 *   />
 */
const ListRow = ({
  avatar,
  icon,
  iconColor = colors.primary,
  iconBg = colors.accentSoft,
  title,
  subtitle,
  titleColor,
  right,
  onPress,
  showChevron = true,
  style,
  containerStyle,
  divider = false,
}) => {
  const [press, pressHandlers] = usePressScale(onPress ? 0.985 : 1);

  const body = (
    <View
      style={[
        styles.row,
        divider && styles.divider,
        {
          backgroundColor: colors.surface,
        },
        press,
        containerStyle,
      ]}
    >
      {avatar ? (
        <Avatar name={avatar} size={44} />
      ) : icon ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm,
          }}
        >
          <Icon name={icon} size={22} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.textWrap}>
        {title ? (
          <Text numberOfLines={1} style={[type.title, { color: titleColor || colors.ink }]}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[type.sub, { color: colors.inkSecondary, marginTop: 2 }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? (
        <View style={styles.right}>{right}</View>
      ) : showChevron && onPress ? (
        <Icon name="chevron-right" size={20} color={colors.inkMuted} style={{ marginLeft: spacing.xs }} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={style} {...pressHandlers}>
        {body}
      </Pressable>
    );
  }
  return <View style={style}>{body}</View>;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  textWrap: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  right: {
    marginLeft: spacing.xs,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

export default ListRow;
