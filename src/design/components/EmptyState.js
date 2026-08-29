import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, type } from '../tokens';
import Icon from '../Icon';
import { FadeInUp } from '../motion';
import Button from './Button';

/**
 * EmptyState
 * ----------
 * Friendly placeholder for empty lists / no results.
 *
 *   <EmptyState icon="search" title="No customers yet" subtitle="..." action={{label:'Add', onPress}} />
 */
const EmptyState = ({ icon = 'search', title, subtitle, action, style }) => {
  return (
    <FadeInUp style={[styles.wrap, style]}>
      <View style={styles.badge}>
        <Icon name={icon} size={30} color={colors.inkMuted} />
      </View>
      {title ? (
        <Text style={[type.h2, { color: colors.ink, textAlign: 'center', marginTop: spacing.lg }]}>
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          style={[
            type.body,
            { color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          variant={action.variant || 'primary'}
          onPress={action.onPress}
          style={{ marginTop: spacing.xl, alignSelf: 'center' }}
        />
      ) : null}
    </FadeInUp>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EmptyState;
