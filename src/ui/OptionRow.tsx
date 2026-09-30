// Settings-style rows: a switch with a hint (Forgive loan, App lock), or a
// tappable row that opens something (Security ›).

import React from 'react';
import { Pressable, Switch as RNSwitch, View } from 'react-native';
import { makeStyles, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function Switch({ value, onChange, disabled, label }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  const t = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: t.colors.border, true: t.colors.primary }}
      thumbColor={t.colors.white}
    />
  );
}

export interface OptionRowProps {
  title: string;
  hint?: string;
  icon?: string;
  /** A switch on the right. */
  toggle?: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  /** Text on the right (current value). */
  value?: string;
  badge?: number;
  onPress?: () => void;
  destructive?: boolean;
}

export function OptionRow({ title, hint, icon, toggle, value, badge, onPress, destructive }: OptionRowProps) {
  const s = useStyles();
  const press = toggle ? () => toggle.onChange(!toggle.value) : onPress;
  return (
    <Pressable
      onPress={press}
      disabled={!press || toggle?.disabled}
      accessibilityRole={toggle ? 'switch' : onPress ? 'button' : undefined}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      style={({ pressed }) => [s.row, pressed && s.pressed]}>
      {icon ? (
        <View style={[s.icon, destructive && s.iconDanger]}>
          <Icon name={icon} size={20} color={destructive ? 'danger' : 'primary'} />
        </View>
      ) : null}
      <View style={s.text}>
        <Text variant="bodyLg" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {hint ? (
          <Text variant="small" color="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={s.badge}>
          <Text variant="caption" weight="bold" color="white">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
      {value ? (
        <Text variant="small" color="muted" numberOfLines={1} style={s.value}>
          {value}
        </Text>
      ) : null}
      {toggle ? (
        <Switch value={toggle.value} onChange={toggle.onChange} disabled={toggle.disabled} label={title} />
      ) : onPress ? (
        <Icon name="chevron-right" size={20} color="muted" />
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, minHeight: 56, paddingVertical: t.space.sm, paddingHorizontal: t.space.lg },
  pressed: { backgroundColor: t.colors.surface2 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconDanger: { backgroundColor: t.colors.dangerSoft },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: '40%' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: t.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
