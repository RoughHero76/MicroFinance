// U-09: always colour plus text, from the one status map (F-5).

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { statusKey, statusTone, type StatusSet, type Tone } from '@/lib/enums';
import { makeStyles, useTheme, type Theme } from '@/theme';
import { Text } from './Text';

export function toneColors(t: Theme, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'success':
      return { fg: t.colors.success, bg: t.colors.successSoft };
    case 'warning':
      return { fg: t.colors.warning, bg: t.colors.warningSoft };
    case 'danger':
      return { fg: t.colors.danger, bg: t.colors.dangerSoft };
    case 'info':
      return { fg: t.colors.info, bg: t.colors.infoSoft };
    case 'primary':
      return { fg: t.colors.primary, bg: t.colors.primarySoft };
    default:
      return { fg: t.colors.muted, bg: t.colors.mutedSoft };
  }
}

export interface StatusBadgeProps {
  set?: StatusSet;
  status?: string | null;
  /** Free label and tone, for badges that aren't a status (e.g. "Admin"). */
  label?: string;
  tone?: Tone;
}

export function StatusBadge({ set, status, label, tone }: StatusBadgeProps) {
  const t = useTheme();
  const s = useStyles();
  const { t: tr } = useTranslation();
  if (!label && !status) return null;
  const resolvedTone = tone ?? (set && status ? statusTone(set, status) : 'neutral');
  const text = label ?? (set && status ? tr(statusKey(set, status), { defaultValue: status }) : status ?? '');
  const colors = toneColors(t, resolvedTone);
  return (
    <View style={[s.badge, { backgroundColor: colors.bg }]} accessibilityLabel={text}>
      <View style={[s.dot, { backgroundColor: colors.fg }]} />
      <Text variant="caption" weight="semibold" style={{ color: colors.fg }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(t => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 24,
    paddingHorizontal: t.space.sm + 2,
    borderRadius: t.radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
}));
