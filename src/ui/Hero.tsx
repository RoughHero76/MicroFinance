// W7: the mock's hero card. A brand gradient (primary → primary2) with a
// soft light circle in the corner and a coloured shadow, used for the one
// headline figure on Home screens. Also CountUp, which rolls a number up to
// its value the first time it appears and when it changes.

import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, View, type StyleProp, type ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {makeStyles, useTheme, withAlpha} from '@/theme';
import {PressableScale} from './PressableScale';
import {Text, type TextProps} from './Text';

export function HeroCard({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const s = useStyles();
  const body = (
    <LinearGradient
      colors={[t.colors.primary, t.colors.primary2]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={s.gradient}>
      <View style={s.circle} pointerEvents="none" />
      <View style={s.circleSmall} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[s.shell, style]}>
        {body}
      </PressableScale>
    );
  }
  return <View style={[s.shell, style]}>{body}</View>;
}

const DURATION = 650;

// Read once and kept current, so CountUp can decide on its first render.
let reduceMotion = false;
Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then(v => {
  reduceMotion = !!v;
});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', v => {
  reduceMotion = v;
});
const inTest = typeof process !== 'undefined' && !!process.env.JEST_WORKER_ID;
const skipMotion = () => inTest || reduceMotion;

/** A number that rolls up to `value` (ease-out), formatted by `format`. */
export function CountUp({
  value,
  format = String,
  ...text
}: {value: number; format?: (n: number) => string} & Omit<TextProps, 'children'>) {
  const [shown, setShown] = useState(() => (skipMotion() ? value : 0));
  const from = useRef(shown);
  useEffect(() => {
    const start = from.current;
    if (skipMotion() || start === value) {
      setShown(value);
      from.current = value;
      return;
    }
    let frame: number | null = null;
    const began = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - began) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? Math.round(start + (value - start) * eased) : value);
      from.current = p < 1 ? start + (value - start) * eased : value;
      frame = p < 1 ? requestAnimationFrame(step) : null;
    };
    frame = requestAnimationFrame(step);
    return () => {
      if (frame != null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [value]);
  return (
    <Text tabular accessibilityLabel={format(value)} {...text}>
      {format(shown)}
    </Text>
  );
}

const useStyles = makeStyles(t => ({
  shell: {borderRadius: t.radius.xl, ...t.shadow.primary, backgroundColor: t.colors.primary},
  gradient: {borderRadius: t.radius.xl, padding: t.space.lg, overflow: 'hidden'},
  circle: {
    position: 'absolute',
    right: -44,
    top: -44,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: withAlpha(t.colors.white, 0.12),
  },
  circleSmall: {
    position: 'absolute',
    right: 40,
    bottom: -36,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: withAlpha(t.colors.white, 0.06),
  },
}));
